/**
 * Webhook Handler: orders/updated
 * Triggered when an order is updated in Shopify
 */

import { authenticate } from "../shopify.server";
import { handleOrderUpdated } from "../services/orderHandler.server";
import { logger } from "../services/logger.server";

export const action = async ({ request }) => {
  let shop;
  let topic;
  let payload;

  try {
    const authResult = await authenticate.webhook(request);
    shop = authResult.shop;
    topic = authResult.topic;
    payload = authResult.payload;
  } catch (error) {
    console.error("Webhook authentication failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }

  logger.debug(
    `Received ${topic} webhook`,
    {
      orderId: payload?.id,
      orderNumber: payload?.name,
    },
    shop
  );

  try {
    await handleOrderUpdated(shop, payload);
  } catch (error) {
    logger.error(
      `Error processing ${topic} webhook`,
      {
        error: error?.message || String(error),
        orderId: payload?.id,
      },
      shop
    );
    // Keep 200 so Shopify doesn't retry forever (unless you want retries)
  }

  return new Response("OK", { status: 200 });
};
