// File: webhooks.register.server.js

import { DeliveryMethod } from "@shopify/shopify-api";
import { authenticate } from "./shopify.server";

/**
 * Register app webhooks (Orders + optional GDPR).
 * Uses Shopify API v12 webhook registry.
 */
export async function registerMandatoryWebhooks(session) {
  if (!session?.shop) throw new Error("Missing session.shop");
  const shop = session.shop;

  // ✅ Use the same shopify instance created by your template
  // In this template it lives under authenticate.*
  const shopify = authenticate?.shopify;

  if (!shopify?.webhooks) {
    throw new Error(
      "Could not access shopify.webhooks from authenticate.shopify. Check app/shopify.server.js exports."
    );
  }

  // Handlers
  shopify.webhooks.addHandlers({
    ORDERS_CREATE: [
      {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: "/webhooks/orders/create",
      },
    ],
    ORDERS_PAID: [
      {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: "/webhooks/orders/paid",
      },
    ],
    ORDERS_UPDATED: [
      {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: "/webhooks/orders/updated",
      },
    ],

    // ❌ Disabled for now because your logs show FeatureDeprecatedError
    // CUSTOMERS_DATA_REQUEST: [{ deliveryMethod: DeliveryMethod.Http, callbackUrl: "/webhooks/customers/data_request" }],
    // CUSTOMERS_REDACT: [{ deliveryMethod: DeliveryMethod.Http, callbackUrl: "/webhooks/customers/redact" }],
    // SHOP_REDACT: [{ deliveryMethod: DeliveryMethod.Http, callbackUrl: "/webhooks/shop/redact" }],
  });

  // ✅ Register with Shopify
  const response = await shopify.webhooks.register({ session });

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
