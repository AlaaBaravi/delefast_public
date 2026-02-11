import fetch from "node-fetch";
import crypto from "crypto";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";

/**
 * Create a configured shopifyApi instance.
 * Uses SHOPIFY_API_VERSION env or falls back to ApiVersion.January25.
 */
function createShopifyInstance() {
  return shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: (process.env.SCOPES || "").split(",").map((s) => s.trim()).filter(Boolean),
    hostName: (process.env.SHOPIFY_APP_URL || "").replace(/^https?:\/\//, ""),
    apiVersion: process.env.SHOPIFY_API_VERSION || ApiVersion.January25,
  });
}

/**
 * Exchange an OAuth code for an access token and return a client + token.
 * This function returns an object: { client: { rest, graphql }, token }.
 */
async function authenticate(shop, code) {
  if (!shop || !code) {
    throw new Error("Missing shop or code for authentication");
  }

  // Exchange authorization code for access token
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const msg = typeof data === "object" ? JSON.stringify(data) : String(data);
    throw new Error(`Authentication failed: ${msg}`);
  }

  const shopify = createShopifyInstance();

  const session = {
    id: `${shop}_${Date.now()}`,
    shop,
    state: "state",
    isOnline: true,
    accessToken: data.access_token,
  };

  const client = {
    rest: new shopify.clients.Rest({ session }),
    graphql: new shopify.clients.Graphql({ session }),
  };

  return { client, token: data.access_token };
}

/**
 * Backwards-compatible helper so existing code that calls authenticate.admin(...)
 * continues to work. authenticate.admin(shop, code) returns the same client object.
 */
authenticate.admin = async (shop, code) => {
  const result = await authenticate(shop, code);
  return result.client;
};

/**
 * Verifies Shopify webhook payload using HMAC SHA256.
 * Accepts a Request-like object with .headers.get and .text() methods.
 */
export const verifyShopifyWebhook = async (request) => {
  const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256") || request.headers.get("x-shopify-hmac-sha256");
  const body = await request.text();
  const secret = process.env.SHOPIFY_API_SECRET;

  if (!hmacHeader || !secret) {
    return { ok: false };
  }

  const hash = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  return { ok: crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader)) };
};

/**
 * Safely build a Headers object from either:
 * - a Headers instance
 * - a plain object with string keys/values
 * - an array of [key, value] pairs
 *
 * Filters out non-string keys/values (including Symbols).
 */
export const addDocumentResponseHeaders = (headers = {}) => {
  const validHeaders = {};

  // If it's a Headers instance (undici or Fetch), iterate with forEach
  try {
    if (typeof headers?.forEach === "function") {
      headers.forEach((value, key) => {
        if (typeof key === "string" && typeof value === "string") {
          validHeaders[key] = value;
        }
      });
    } else if (Array.isArray(headers)) {
      // Array of pairs
      for (const pair of headers) {
        if (Array.isArray(pair) && pair.length >= 2) {
          const [key, value] = pair;
          if (typeof key === "string" && typeof value === "string") {
            validHeaders[key] = value;
          }
        }
      }
    } else if (headers && typeof headers === "object") {
      // Plain object
      for (const [key, value] of Object.entries(headers)) {
        if (typeof key === "string" && typeof value === "string") {
          validHeaders[key] = value;
        } else {
          // Avoid logging secrets in production; keep this minimal
          // console.warn(`Invalid header key or value: ${String(key)} => ${String(value)}`);
        }
      }
    }
  } catch (err) {
    // If anything unexpected happens, fall back to empty headers
    // console.error("Error normalizing headers", err);
  }

  // Add Shopify-specific headers
  validHeaders["X-Shopify-Shop-Domain"] = process.env.SHOPIFY_SHOP_DOMAIN || "unknown";
  validHeaders["X-Shopify-App-Bridge"] = "true";

  // Use global Headers (Node 18+ / undici). If not available, create a minimal polyfill object.
  if (typeof Headers !== "undefined") {
    return new Headers(validHeaders);
  } else {
    // Minimal fallback: return the plain object (some runtimes accept this)
    return validHeaders;
  }
};

/**
 * Build the OAuth authorization URL for a given shop.
 * Returns { redirectUrl } or { error }.
 */
export const login = async (request) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return { error: "No shop parameter found in the request URL" };
  }

  const redirectUri = `${process.env.SHOPIFY_APP_URL.replace(/\/$/, "")}/auth/callback`;
  const scopes = encodeURIComponent(process.env.SCOPES || "");
  const clientId = encodeURIComponent(process.env.SHOPIFY_API_KEY || "");
  const state = encodeURIComponent("random_state_value"); // replace with real state handling in production

  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${state}`;

  return { redirectUrl: authUrl };
};

// Export authenticate as both default and named export (backwards compatibility)
export { authenticate };
export default authenticate;
