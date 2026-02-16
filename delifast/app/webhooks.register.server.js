// File: app/webhooks.register.server.js

import { shopifyApi, ApiVersion } from "@shopify/shopify-api";

/**
 * Registers webhooks using the APP (GraphQL webhook subscriptions).
 * IMPORTANT:
 * - These webhooks will be signed using your APP secret (SHOPIFY_API_SECRET),
 *   so authenticate.webhook(request) will validate correctly.
 * - Do NOT create webhooks manually from Shopify Admin.
 */
export async function registerMandatoryWebhooks(session) {
  const appUrl = process.env.SHOPIFY_APP_URL;
  if (!appUrl) throw new Error("Missing SHOPIFY_APP_URL env var");
  if (!session?.shop) throw new Error("Missing session.shop");

  // PrismaSessionStorage usually stores accessToken on session.accessToken
  const accessToken = session.accessToken || session.access_token;
  if (!accessToken) throw new Error("Session missing access token");

  const apiVersion =
    process.env.SHOPIFY_API_VERSION ||
    ApiVersion.October25 ||
    ApiVersion.January25;

  const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: (process.env.SCOPES || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    hostName: new URL(appUrl).host,
    apiVersion,
    isEmbeddedApp: true,
  });

  const gqlClient = new shopify.clients.Graphql({
    session: {
      id: session.id || `${session.shop}_${Date.now()}`,
      shop: session.shop,
      accessToken,
      isOnline: false, // ✅ use OFFLINE token for webhooks
      state: "state",
    },
  });

  // ✅ Add GDPR + ORDERS webhooks here
  const webhooks = [
    // GDPR (required)
    { topic: "CUSTOMERS_DATA_REQUEST", path: "/webhooks/customers/data_request" },
    { topic: "CUSTOMERS_REDACT", path: "/webhooks/customers/redact" },
    { topic: "SHOP_REDACT", path: "/webhooks/shop/redact" },

    // Orders (your business logic)
    { topic: "ORDERS_CREATE", path: "/webhooks/orders/create" },
    { topic: "ORDERS_PAID", path: "/webhooks/orders/paid" },
    { topic: "ORDERS_UPDATED", path: "/webhooks/orders/updated" }, // optional but useful
  ];

  const mutation = `
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        userErrors { field message }
        webhookSubscription { id endpoint { callbackUrl } }
      }
    }
  `;

  const results = [];

  for (const w of webhooks) {
    const callbackUrl = new URL(w.path, appUrl).toString();

    try {
      const res = await gqlClient.query({
        data: {
          query: mutation,
          variables: {
            topic: w.topic,
            webhookSubscription: {
              callbackUrl,
              format: "JSON",
            },
          },
        },
      });

      const createResult = res?.body?.data?.webhookSubscriptionCreate;
      const userErrors = createResult?.userErrors || [];
      const subscription = createResult?.webhookSubscription;

      if (userErrors.length) {
        console.error("[WEBHOOKS] create error", w.topic, userErrors);
        results.push({ topic: w.topic, ok: false, errors: userErrors });
        continue;
      }

      console.log("[WEBHOOKS] registered", w.topic, subscription?.id, callbackUrl);
      results.push({ topic: w.topic, ok: true, id: subscription?.id, callbackUrl });
    } catch (err) {
      console.error("[WEBHOOKS] registration failed", w.topic, err);
      results.push({ topic: w.topic, ok: false, error: String(err) });
    }
  }

  return { success: results.every((r) => r.ok), details: results };
}

export default registerMandatoryWebhooks;
