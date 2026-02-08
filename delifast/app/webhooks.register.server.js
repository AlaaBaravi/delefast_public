const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-10";

async function shopifyGraphQL({ shop, accessToken, query, variables }) {
  const url = `https://${shop}/admin/api/${API_VERSION}/graphql.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Shopify GraphQL HTTP ${res.status}: ${JSON.stringify(json)}`);
  }
  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

export async function registerAllWebhooks({ shop, accessToken, appUrl }) {
  const topics = [
    { topic: "ORDERS_CREATE", path: "/webhooks/orders/create" },
    { topic: "ORDERS_PAID", path: "/webhooks/orders/paid" },
    { topic: "ORDERS_UPDATED", path: "/webhooks/orders/updated" },
    { topic: "APP_UNINSTALLED", path: "/webhooks/app/uninstalled" },
    { topic: "APP_SCOPES_UPDATE", path: "/webhooks/app/scopes_update" },

    // Mandatory compliance topics
    { topic: "CUSTOMERS_DATA_REQUEST", path: "/webhooks/customers/data_request" },
    { topic: "CUSTOMERS_REDACT", path: "/webhooks/customers/redact" },
    { topic: "SHOP_REDACT", path: "/webhooks/shop/redact" },
  ];

  const mutation = `
    mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $callbackUrl: URL!) {
      webhookSubscriptionCreate(
        topic: $topic
        webhookSubscription: { callbackUrl: $callbackUrl, format: JSON }
      ) {
        userErrors { field message }
        webhookSubscription { id }
      }
    }
  `;

  for (const t of topics) {
    const callbackUrl = `${appUrl}${t.path}`;

    const data = await shopifyGraphQL({
      shop,
      accessToken,
      query: mutation,
      variables: { topic: t.topic, callbackUrl },
    });

    const errors = data.webhookSubscriptionCreate.userErrors;
    if (errors?.length) {
      // If already exists, Shopify may return an error depending on state.
      // We don't hard-fail unless it's not "already taken".
      const msg = errors.map((e) => e.message).join(" | ");
      if (!msg.toLowerCase().includes("taken") && !msg.toLowerCase().includes("already")) {
        throw new Error(`Webhook create failed for ${t.topic}: ${msg}`);
      }
    }
  }
}
