/**
 * Mandatory compliance webhook: shop/redact
 * Shopify sends this after app uninstall when shop data must be deleted.
 */
import { authenticate } from "../../shopify.server";
import { logger } from "../../services/logger.server";
import prisma from "../../db.server";

export const action = async ({ request }) => {
  try {
    const { shop, topic, payload } = await authenticate.webhook(request);

    logger.info(`Received ${topic} compliance webhook`, { shop, payload }, shop);

    try {
      // OPTIONAL:
      // Delete/redact any data you store for this shop
      // Example:
      // await prisma.session.deleteMany({ where: { shop } });
      // await prisma.someTable.deleteMany({ where: { shop } });
    } catch (dbErr) {
      logger.warn("Shop redact DB cleanup skipped/failed", {
        error: dbErr?.message || String(dbErr),
      }, shop);
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
