/**
 * Webhook Handler: orders/create
 * Triggered when a new order is created in Shopify
 */

import { authenticate } from "../shopify.server";
import { handleOrderCreated } from "../services/orderHandler.server";
import { logger } from "../services/logger.server";

export const action = async ({ request }) => {
  let shop;
  let topic;
  let payload;
  let admin;

  try {
    // ✅ Webhook verification happens here (HMAC + topic)
    const authResult = await authenticate.webhook(request);
    shop = authResult.shop;
    topic = authResult.topic;
    payload = authResult.payload;
    admin = authResult.admin;
  } catch (error) {
    // ✅ If verification fails, Shopify expects 401
    console.error("Webhook authentication failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }

  // ✅ At this point: verified, safe to process
  logger.info(
    `Received ${topic} webhook`,
    {
      orderId: payload?.id,
      orderNumber: payload?.name,
    },
    shop
  );

  try {
    await handleOrderCreated(shop, payload, admin);
  } catch (error) {
    logger.error(
      `Error processing ${topic} webhook`,
      {
        error: error?.message || String(error),
        orderId: payload?.id,
      },
      shop
    );

    // ⚠️ IMPORTANT:
    // Still return 200 so Shopify doesn't keep retrying forever.
    // You can also return 500 if you WANT retries, but most apps don't.
  }

  // ✅ Always acknowledge receipt
  return new Response("OK", { status: 200 });
};
