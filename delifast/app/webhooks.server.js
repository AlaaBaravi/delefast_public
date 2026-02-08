import { DeliveryMethod } from "@shopify/shopify-api";

export async function registerWebhooks(shopify) {
  await shopify.webhooks.register({
    path: "/webhooks/customers/redact",
    topic: "CUSTOMERS_REDACT",
    deliveryMethod: DeliveryMethod.Http,
  });

  await shopify.webhooks.register({
    path: "/webhooks/customers/data_request",
    topic: "CUSTOMERS_DATA_REQUEST",
    deliveryMethod: DeliveryMethod.Http,
  });

  await shopify.webhooks.register({
    path: "/webhooks/shop/redact",
    topic: "SHOP_REDACT",
    deliveryMethod: DeliveryMethod.Http,
  });
}
