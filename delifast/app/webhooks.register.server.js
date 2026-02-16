// File: app/webhooks.register.server.js

import { DeliveryMethod } from "@shopify/shopify-api";
import { registerWebhooks } from "./shopify.server";

/**
 * Register app webhooks for a shop session using the SAME Shopify instance
 * that powers authenticate.webhook().
 *
 * This prevents 401 "Unauthorized" verification failures caused by mixing
 * different shopifyApi() instances/configs.
 */
export async function registerMandatoryWebhooks(session) {
  if (!session || !session.shop) throw new Error("Missing session.shop");

  // IMPORTANT: This uses shopify.registerWebhooks() from shopify.server.js
  // so the signature verification matches authenticate.webhook().
  const result = await registerWebhooks({
    session,
    webhooks: {
      // GDPR mandatory topics
      CUSTOMERS_DATA_REQUEST: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: "/webhooks/customers/data_request",
      },
      CUSTOMERS_REDACT: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: "/webhooks/customers/redact",
      },
      SHOP_REDACT: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: "/webhooks/shop/redact",
      },

      // Your order webhooks (if you need them)
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

      // App lifecycle (optional but recommended)
      APP_UNINSTALLED: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: "/webhooks/app/uninstalled",
      },
      APP_SCOPES_UPDATE: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: "/webhooks/app/scopes_update",
      },
    },
  });

  return { success: true, details: result };
}

export default registerMandatoryWebhooks;
