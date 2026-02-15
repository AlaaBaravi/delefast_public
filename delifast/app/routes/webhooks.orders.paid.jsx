/**
 * Webhook Handler: orders/paid
 * Triggered when an order is marked as paid in Shopify
 */

import { authenticate } from "../shopify.server";
import { handleOrderPaid } from "../services/orderHandler.server";
import { logger } from "../services/logger.server";

export const action = async ({ request }) => {
  let shop;
  let topic;
  let payload;
  let admin;

  try {
    const authResult = await authenticate.webhook(request);
    shop = authResult.shop;
    topic = authResult.topic;
    payload = authResult.payload;
    admin = authResult.admin;
  } catch (error) {
    console.error("Webhook authentication failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }

  logger.info(
    `Received ${topic} webhook`,
    {
      orderId: payload?.id,
      orderNumber: payload?.name,
      financialStatus: payload?.financial_status,
    },
    shop
  );

  try {
    await handleOrderPaid(shop, payload, admin);
  } catch (error) {
    logger.error(
      `Error processing ${topic} webhook`,
      {
        error: error?.message || String(error),
        orderId: payload?.id,
      },
      shop
    );

    // Keep 200 to avoid repeated retries (unless you want retries)
  }

  return new Response("OK", { status: 200 });
};
