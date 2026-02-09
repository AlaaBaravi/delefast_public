import { shopifyApi, ApiVersion } from "@shopify/shopify-api";

export async function registerMandatoryWebhooks(session) {
  const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET,
    scopes: (process.env.SCOPES || "").split(","),
    hostName: new URL(process.env.SHOPIFY_APP_URL).host,
    apiVersion: ApiVersion.October25,
    isEmbeddedApp: true,
  });

  const client = new shopify.clients.Graphql({ session });

  const baseUrl = process.env.SHOPIFY_APP_URL;

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
              userErrors { message }
              webhookSubscription { id }
            }
          }
        `,
        variables: {
          topic: w.topic,
          webhookSubscription: {
            callbackUrl: `${baseUrl}${w.path}`,
            format: "JSON",
          },
        },
      },
    });

    const errors = res?.body?.data?.webhookSubscriptionCreate?.userErrors || [];
    if (errors.length) {
      console.error("Webhook create error:", w.topic, errors);
    } else {
      console.log("Webhook registered:", w.topic);
    }
  }
}
