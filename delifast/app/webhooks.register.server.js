// File: app/webhooks.register.server.js

import { DeliveryMethod } from "@shopify/shopify-api";
import { registerWebhooks, sessionStorage } from "./shopify.server";

/**
 * Registers webhooks using the OFFLINE session token.
 *
 * Why offline?
 * - Webhook registration is an Admin GraphQL operation.
 * - Using an online session (short-lived / user-based) can return 401 Unauthorized.
 * - Offline session (app-level) is the correct token to use.
 *
 * Notes:
 * - If offline session does not exist, you must uninstall + reinstall the app
 *   (and delete old sessions) so Shopify issues a fresh offline token.
 */
export async function registerMandatoryWebhooks(session) {
  if (!session?.shop) {
    throw new Error("Missing session.shop");
  }

  const shop = session.shop;

  // Load OFFLINE session for this shop
  const offlineSessionId = `offline_${shop}`;
  const offlineSession = await sessionStorage.loadSession(offlineSessionId);

  if (!offlineSession?.accessToken) {
    throw new Error(
      `Missing offline session/token for ${shop}. Uninstall + reinstall the app (and clear old sessions) to regenerate it.`
    );
  }

  // Register webhooks using the SAME shopify instance from shopify.server.js
  return registerWebhooks({
    session: offlineSession,
    webhooks: {
      // ---- Orders ----
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

      // ---- GDPR Mandatory ----
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

      // ---- App Lifecycle ----
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
}

export default registerMandatoryWebhooks;
