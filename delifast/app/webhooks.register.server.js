import { shopifyApi, ApiVersion } from "@shopify/shopify-api";

export async function registerMandatoryWebhooks(session) {
  const appUrl = process.env.SHOPIFY_APP_URL;
  if (!appUrl) throw new Error("Missing SHOPIFY_APP_URL env var");

  const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: (process.env.SCOPES || "").split(",").filter(Boolean),
    hostName: new URL(appUrl).host,
    apiVersion: ApiVersion.October25,
    isEmbeddedApp: true,
  });

  const client = new shopify.clients.Graphql({ session });

  const webhooks = [
    { topic: "CUSTOMERS_DATA_REQUEST", path: "/webhooks/customers/data_request" },
    { topic: "CUSTOMERS_REDACT", path: "/webhooks/customers/redact" },
    { topic: "SHOP_REDACT", path: "/webhooks/shop/redact" },
  ];

  for (const w of webhooks) {
    const res = await client.query({
      data: {
        query: `
          mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
            webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
              userErrors { field message }
              webhookSubscription { id }
            }
          }
        `,
        variables: {
          topic: w.topic,
          webhookSubscription: {
            callbackUrl: `${appUrl}${w.path}`,
            format: "JSON",
          },
        },
      },
    });

    const errors = res?.body?.data?.webhookSubscriptionCreate?.userErrors || [];
    if (errors.length) {
      console.error("[GDPR] webhook create error", w.topic, errors);
    } else {
      console.log("[GDPR] webhook registered", w.topic);
    }
  }
}
