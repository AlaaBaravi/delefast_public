// File: webhooks.register.server.js

import { shopifyApi, ApiVersion } from "@shopify/shopify-api";

/**
 * Register mandatory GDPR webhooks for a shop session.
 * - session: a session-like object containing at least { shop, accessToken }
 * - returns: { success: true, details: [...] } or throws on fatal errors
 *
 * Notes:
 * - In production persist webhook subscription IDs if you need to manage/unsubscribe later.
 * - Replace console logging with your app's logger as needed.
 */
export async function registerMandatoryWebhooks(session) {
  const appUrl = process.env.SHOPIFY_APP_URL;
  if (!appUrl) throw new Error("Missing SHOPIFY_APP_URL env var");
  if (!session || !session.shop) throw new Error("Missing session.shop");
  if (!session.accessToken && !session.access_token) {
    throw new Error("Session missing access token (accessToken or access_token)");
  }

  // Normalize access token property name
  const accessToken = session.accessToken || session.access_token;

  // Build shopify instance using env API version or fallback
  const apiVersion = process.env.SHOPIFY_API_VERSION || ApiVersion.October25 || ApiVersion.January25;
  const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: (process.env.SCOPES || "").split(",").map((s) => s.trim()).filter(Boolean),
    hostName: new URL(appUrl).host,
    apiVersion,
    isEmbeddedApp: true,
  });

  // Create a GraphQL client using the provided session (must include accessToken)
  const gqlClient = new shopify.clients.Graphql({
    session: {
      id: session.id || `${session.shop}_${Date.now()}`,
      shop: session.shop,
      accessToken,
      isOnline: session.isOnline ?? true,
    },
  });

  // Topics and local paths (Shopify GraphQL enum names)
  const webhooks = [
    { topic: "CUSTOMERS_DATA_REQUEST", path: "/webhooks/customers/data_request" },
    { topic: "CUSTOMERS_REDACT", path: "/webhooks/customers/redact" },
    { topic: "SHOP_REDACT", path: "/webhooks/shop/redact" },
  ];

  const results = [];

  for (const w of webhooks) {
    try {
      // Build a safe absolute callback URL
      const callbackUrl = new URL(w.path, appUrl).toString();

      const query = `
        mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
          webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
            userErrors { field message }
            webhookSubscription { id endpoint { callbackUrl } }
          }
        }
      `;

      const variables = {
        topic: w.topic,
        webhookSubscription: {
          callbackUrl,
          format: "JSON",
        },
      };

      // Execute GraphQL mutation
      const res = await gqlClient.query({
        data: {
          query,
          variables,
        },
      });

      // Defensive access to response body
      const body = res && res.body ? res.body : {};
      const createResult = body?.data?.webhookSubscriptionCreate;
      const userErrors = createResult?.userErrors || [];
      const subscription = createResult?.webhookSubscription || null;

      if (userErrors.length) {
        console.error("[GDPR] webhook create error", w.topic, userErrors);
        results.push({ topic: w.topic, ok: false, errors: userErrors });
      } else if (subscription && subscription.id) {
        console.log("[GDPR] webhook registered", w.topic, subscription.id);
        results.push({ topic: w.topic, ok: true, id: subscription.id, callbackUrl: subscription.endpoint?.callbackUrl || callbackUrl });
      } else {
        // Unexpected shape
        console.warn("[GDPR] webhook create returned unexpected response", w.topic, body);
        results.push({ topic: w.topic, ok: false, errors: [{ message: "Unexpected response shape", body }] });
      }
    } catch (err) {
      // Network or client error
      console.error("[GDPR] webhook registration failed", w.topic, err);
      results.push({ topic: w.topic, ok: false, error: String(err) });
    }
  }

  // Return summary so caller can inspect and act on failures
  return { success: results.every((r) => r.ok), details: results };
}

export default registerMandatoryWebhooks;
