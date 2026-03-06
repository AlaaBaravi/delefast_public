import { shopify } from "./shopify.server";

/*
These are the mandatory Shopify compliance webhooks required
for Shopify App Store submission.
*/
const mandatoryTopics = [
  "CUSTOMERS_DATA_REQUEST",
  "CUSTOMERS_REDACT",
  "SHOP_REDACT",
];

export async function registerMandatoryWebhooks(session) {
  try {

    // Register all webhooks defined in shopify.server.js
    await shopify.registerWebhooks({ session });

    // Ensure mandatory compliance webhooks are registered
    for (const topic of mandatoryTopics) {
      const response = await shopify.webhooks.register({
        session,
        topic,
        path: `/webhooks/${topic.toLowerCase()}`,
      });

      if (!response.success) {
        console.error(`[WEBHOOK] Failed to register ${topic}`, response);
      } else {
        console.log(`[WEBHOOK] Registered ${topic}`);
      }
    }

    console.log(`[WEBHOOKS] All webhooks registered for ${session.shop}`);

  } catch (err) {
    console.error("[WEBHOOKS] Registration failed:", err);
  }
}
