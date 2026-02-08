/**
 * Mandatory compliance webhook: customers/redact
 * Shopify sends this when customer data must be deleted/redacted.
 */

import { authenticate } from "../shopify.server";
import { logger } from "../services/logger.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  try {
    // Verifies HMAC + parses payload
    const { shop, topic, payload } = await authenticate.webhook(request);

    logger.info(
      `Received ${topic} compliance webhook`,
      { shop, payload },
      shop
    );

    const customerId =
      payload?.customer?.id != null ? String(payload.customer.id) : null;

    if (customerId) {
      try {
        // OPTIONAL: delete/redact any stored customer data in YOUR DB
        // Example (uncomment and adjust to your schema):
        // await prisma.customerData.deleteMany({ where: { shop, customerId } });
      } catch (dbErr) {
        logger.warn(
          "Customer redact DB cleanup skipped/failed",
          {
            error: dbErr?.message || String(dbErr),
            customerId,
          },
          shop
        );
      }
    }

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
