import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,

  /** 🔴 أضف الجزء ده */
  webhooks: {
    ORDERS_CREATE: {
      topic: "orders/create",
      route: "/webhooks/orders/create",
    },
    ORDERS_PAID: {
      topic: "orders/paid",
      route: "/webhooks/orders/paid",
    },

    // ✅ mandatory compliance webhooks
    CUSTOMERS_DATA_REQUEST: {
      topic: "customers/data_request",
      route: "/webhooks/customers/data_request",
    },
    CUSTOMERS_REDACT: {
      topic: "customers/redact",
      route: "/webhooks/customers/redact",
    },
    SHOP_REDACT: {
      topic: "shop/redact",
      route: "/webhooks/shop/redact",
    },
  },

  future: {
    expiringOfflineAccessTokens: true,
  },
});

export default shopify;
export const authenticate = shopify.authenticate;
export const registerWebhooks = shopify.registerWebhooks;
