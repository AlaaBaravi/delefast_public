import { shopifyApi, ApiVersion } from "@shopify/shopify-api";

const api = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: (process.env.SCOPES || "").split(","),
  hostName: new URL(process.env.SHOPIFY_APP_URL).host,
  apiVersion: ApiVersion.October25,
  isEmbeddedApp: true,
});

export async function registerAllWebhooks(session) {
  const baseUrl = process.env.SHOPIFY_APP_URL;

  const registrations = [
    {
      topic: "CUSTOMERS_DATA_REQUEST",
      webhookSubscription: {
        callbackUrl: `${baseUrl}/webhooks/customers/data_request`,
        format: "JSON",
      },
    },
    {
      topic: "CUSTOMERS_REDACT",
      webhookSubscription: {
        callbackUrl: `${baseUrl}/webhooks/customers/redact`,
        format: "JSON",
      },
    },
    {
      topic: "SHOP_REDACT",
      webhookSubscription: {
        callbackUrl: `${baseUrl}/webhooks/shop/redact`,
        format: "JSON",
      },
    },
    {
      topic: "ORDERS_CREATE",
      webhookSubscription: {
        callbackUrl: `${baseUrl}/webhooks/orders/create`,
        format: "JSON",
      },
    },
    {
      topic: "ORDERS_PAID",
      webhookSubscription: {
        callbackUrl: `${baseUrl}/webhooks/orders/paid`,
        format: "JSON",
      },
    },
    {
      topic: "ORDERS_UPDATED",
      webhookSubscription: {
        callbackUrl: `${baseUrl}/webhooks/orders/updated`,
        format: "JSON",
      },
    },
  ];

  const client = new api.clients.Graphql({ session });

  for (const r of registrations) {
    await client.query({
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
          topic: r.topic,
          webhookSubscription: r.webhookSubscription,
        },
      },
    });
  }
}
