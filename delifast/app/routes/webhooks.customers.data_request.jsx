/**
 * Mandatory compliance webhook: customers/data_request
 * Shopify sends this when a customer requests their stored data.
 */

import { authenticate } from "../shopify.server";
import { logger } from "../services/logger.server";

export const action = async ({ request }) => {
  try {
    // Verifies HMAC + parses payload
    const { shop, topic, payload } = await authenticate.webhook(request);

    logger.info(
      `Received ${topic} compliance webhook`,
      { shop, payload },
      shop
    );

    // Shopify only requires a 200 response here
    return new Response(null, { status: 200 });
  } catch (error) {
    logger.error("Compliance webhook authentication failed", {
      error: error?.message || String(error),
      method: request.method,
      url: request.url,
    });

    // Shopify requirement: invalid HMAC => 401
    return new Response("Unauthorized", { status: 401 });
  }
};
