/**
 * Mandatory compliance webhook: customers/data_request
 * Shopify sends this when a customer requests their data.
 */

import { authenticate } from "../shopify.server";
import { logger } from "../services/logger.server";

export const action = async ({ request }) => {
  try {
    const { shop, topic } = await authenticate.webhook(request);

    logger.info(`Received ${topic} compliance webhook`, { shop }, shop);

    return new Response(null, { status: 200 });
  } catch (error) {
    logger.error("Compliance webhook authentication failed", {
      error: error?.message || String(error),
      method: request.method,
      url: request.url,
    });

    return new Response("Unauthorized", { status: 401 });
  }
};
