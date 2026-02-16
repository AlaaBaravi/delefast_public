// File: webhooks.register.server.js

import { DeliveryMethod } from "@shopify/shopify-api";
import { shopify } from "./shopify.server"; // ✅ use your existing shopify instance (from template)

/**
 * Register app webhooks (Orders + optional GDPR).
 * IMPORTANT:
 * - Uses Shopify API v12 webhook registry (recommended).
 * - DO NOT use GraphQL webhookSubscriptionCreate in v12.
 */
export async function registerMandatoryWebhooks(session) {
  if (!session?.shop) throw new Error("Missing session.shop");
  const shop = session.shop;

  // ✅ Register webhooks using the official registry method
  // Make sure these paths exist as routes in your app.
  // Example: app/routes/webhooks.orders.create.jsx etc.

  const handlers = {
    ORDERS_CREATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/create",
    },
    ORDERS_PAID: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/paid",
    },
    ORDERS_UPDATED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/updated",
    },

    // ❌ GDPR topics are throwing "FeatureDeprecatedError" for you right now.
    // Leave them disabled until you confirm the exact required topics for your app + API version.
    // CUSTOMERS_DATA_REQUEST: {
    //   deliveryMethod: DeliveryMethod.Http,
    //   callbackUrl: "/webhooks/customers/data_request",
    // },
    // CUSTOMERS_REDACT: {
    //   deliveryMethod: DeliveryMethod.Http,
    //   callbackUrl: "/webhooks/customers/redact",
    // },
    // SHOP_REDACT: {
    //   deliveryMethod: DeliveryMethod.Http,
    //   callbackUrl: "/webhooks/shop/redact",
    // },
  };

  // ✅ register them in the registry
  for (const [topic, cfg] of Object.entries(handlers)) {
    shopify.webhooks.addHandlers({
      [topic]: [cfg],
    });
  }

  // ✅ Perform the actual registration against Shopify
  const response = await shopify.webhooks.register({
    session,
  });

  // response is an object keyed by topic
  const details = Object.entries(response).map(([topic, arr]) => {
    const item = Array.isArray(arr) ? arr[0] : arr;
    return {
      topic,
      success: item?.success ?? false,
      result: item?.result ?? null,
      errors: item?.errors ?? null,
    };
  });

  const success = details.every((d) => d.success);

  if (!success) {
    console.error("[WEBHOOKS] Some registrations failed", details);
  } else {
    console.log("[WEBHOOKS] Registered for shop:", shop);
  }

  return { success, details };
}

export default registerMandatoryWebhooks;
