import fetch from "node-fetch";
import crypto from "crypto";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";

/**
 * Simple in-memory session store for demo/dev.
 * In production, replace with persistent storage (DB, Redis).
 */
const sessionStore = new Map();

function saveSession(shop, session) {
  sessionStore.set(shop, session);
}

function getSession(shop) {
  return sessionStore.get(shop) || null;
}

/**
 * Create a configured shopifyApi instance.
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
 * Build client object (rest, graphql) from a session-like object containing accessToken and shop.
 */
function buildClientFromSession(session) {
  const shopify = createShopifyInstance();
  const client = {
    rest: new shopify.clients.Rest({ session }),
    graphql: new shopify.clients.Graphql({ session }),
  };
  return client;
}

/**
 * Exchange an OAuth code for an access token and return { client, token }.
 * Also saves the session in the in-memory store for later use.
 */
async function authenticate(shop, code) {
  if (!shop || !code) {
    throw new Error("Missing shop or code for authentication");
  }

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

  const session = {
    id: `${shop}_${Date.now()}`,
    shop,
    state: "state",
    isOnline: true,
    accessToken: data.access_token,
  };

  // Save session for later retrieval by authenticate.admin(shop)
  saveSession(shop, session);

  const client = buildClientFromSession(session);
  return { client, token: data.access_token, session };
}

/**
 * Backwards-compatible helper so existing code that calls authenticate.admin(...)
 * continues to work. Behavior:
 * - If code is provided: exchange code and return client.
 * - If code is missing: try to return client from saved session.
 * - If no saved session: try to use SHOPIFY_ACCESS_TOKEN env (dev fallback).
 * - If none available: return null (caller should handle) or throw if strict.
 */
authenticate.admin = async (shop, code) => {
  // If code provided, perform full OAuth exchange and return client
  if (shop && code) {
    const result = await authenticate(shop, code);
    return result.client;
  }

  // Try to get saved session
  if (shop) {
    const saved = getSession(shop);
    if (saved && saved.accessToken) {
      return buildClientFromSession(saved);
    }
  }

  // Dev fallback: use environment token if present
  const envToken = process.env.SHOPIFY_ACCESS_TOKEN;
  if (envToken && shop) {
    const session = {
      id: `${shop}_envtoken`,
      shop,
      state: "env",
      isOnline: true,
      accessToken: envToken,
    };
    // Optionally save it for subsequent calls
    saveSession(shop, session);
    return buildClientFromSession(session);
  }

  // No code, no session, no env token: return null so caller can handle gracefully
  // (This avoids throwing an opaque error that causes a 500 without context.)
  return null;
};

/**
 * Verifies Shopify webhook payload using HMAC SHA256.
 */
export const verifyShopifyWebhook = async (request) => {
  const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256") || request.headers.get("x-shopify-hmac-sha256");
  const body = await request.text();
  const secret = process.env.SHOPIFY_API_SECRET;

  if (!hmacHeader || !secret) return { ok: false };

  const hash = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
  try {
    const ok = crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
    return { ok };
  } catch {
    return { ok: false };
  }
};

/**
 * Safely build a Headers object from various inputs, filtering out non-string keys/values.
 */
export const addDocumentResponseHeaders = (headers = {}) => {
  const validHeaders = {};

  try {
    if (headers && typeof headers.forEach === "function") {
      headers.forEach((value, key) => {
        if (typeof key === "string" && typeof value === "string") validHeaders[key] = value;
      });
    } else if (Array.isArray(headers)) {
      for (const pair of headers) {
        if (Array.isArray(pair) && pair.length >= 2) {
          const [key, value] = pair;
          if (typeof key === "string" && typeof value === "string") validHeaders[key] = value;
        }
      }
    } else if (headers && typeof headers === "object") {
      for (const [key, value] of Object.entries(headers)) {
        if (typeof key === "string" && typeof value === "string") validHeaders[key] = value;
      }
    }
  } catch (err) {
    // swallow normalization errors to avoid crashing the server
  }

  validHeaders["X-Shopify-Shop-Domain"] = process.env.SHOPIFY_SHOP_DOMAIN || "unknown";
  validHeaders["X-Shopify-App-Bridge"] = "true";

  if (typeof Headers !== "undefined") {
    return new Headers(validHeaders);
  } else {
    return validHeaders;
  }
};

/**
 * Build the OAuth authorization URL for a given shop.
 */
export const login = async (request) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) return { error: "No shop parameter found in the request URL" };

  const redirectUri = `${process.env.SHOPIFY_APP_URL.replace(/\/$/, "")}/auth/callback`;
  const scopes = encodeURIComponent(process.env.SCOPES || "");
  const clientId = encodeURIComponent(process.env.SHOPIFY_API_KEY || "");
  const state = encodeURIComponent("random_state_value");

  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&state=${state}`;

  return { redirectUrl: authUrl };
};

// Export authenticate as both default and named export
export { authenticate };
export default authenticate;
