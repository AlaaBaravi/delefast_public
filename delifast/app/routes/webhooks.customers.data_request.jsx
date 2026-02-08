/**
 * Mandatory compliance webhook: customers/data_request
 * Shopify sends this when a customer requests their stored data.
 */
import { authenticate } from "../../shopify.server";
import { logger } from "../../services/logger.server";

export const action = async ({ request }) => {
  try {
    const { shop, topic, payload } = await authenticate.webhook(request);

    logger.info(`Received ${topic} compliance webhook`, { shop, payload }, shop);

    // You can optionally prepare data for the merchant here.
    // Shopify only requires a 200 response.

    return new Response(null, { status: 200 });
  } catch (error) {
    logger.error("Compliance webhook authentication failed", {
      error: error?.message || String(error),
      method: request.method,
      url: request.url,
    });

    // Shopify requirement: invalid HMAC -> 401
    return new Response("Unauthorized", { status: 401 });
  }
};

// IMPORTANT: no loader() here (prevents GET handling issues)
