import { shopify } from "./shopify.server";

// This MUST use `shopify.registerWebhooks`, NOT authenticate.shopify.webhooks
export async function registerMandatoryWebhooks(session) {
  try {
    await shopify.registerWebhooks({ session });
    console.log(`[WEBHOOKS] Registered for shop: ${session.shop}`);
  } catch (err) {
    console.error("[WEBHOOKS] Registration failed:", err);
  }
}
