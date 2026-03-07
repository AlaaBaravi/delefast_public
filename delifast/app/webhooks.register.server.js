import shopify from "./shopify.server";

/*
  Mandatory Shopify App Store compliance webhooks
*/

const mandatoryTopics = [
  "CUSTOMERS_DATA_REQUEST",
  "CUSTOMERS_REDACT",
  "SHOP_REDACT",
];

/*
  Register all webhooks defined in shopify.server.js
*/

export async function registerMandatoryWebhooks(session) {
  try {

    // Register webhooks defined in shopify.server.js
    const responses = await shopify.registerWebhooks({ session });

    for (const topic in responses) {
      if (!responses[topic].success) {
        console.error(`[WEBHOOK] Failed to register ${topic}`, responses[topic]);
      } else {
        console.log(`[WEBHOOK] Registered ${topic}`);
      }
    }

    console.log(`[WEBHOOKS] Webhooks registered for ${session.shop}`);

  } catch (error) {
    console.error("[WEBHOOKS] Registration failed:", error);
  }
}
