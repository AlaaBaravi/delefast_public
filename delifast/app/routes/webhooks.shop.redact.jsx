/**
 * Mandatory compliance webhook: shop/redact
 */

import { authenticate } from "../shopify.server";
import { logger } from "../services/logger.server";

export const action = async ({ request }) => {
  try {
    const { shop, topic, payload } = await authenticate.webhook(request);

    logger.info(`Received ${topic} compliance webhook`, { shop, payload }, shop);

    try {
      // ✅ Import Prisma ONLY inside action (server-only)
      const { default: prisma } = await import("../db.server");

      // OPTIONAL: delete/redact any data you store for this shop in YOUR DB
      // Examples:
      // await prisma.session.deleteMany({ where: { shop } });
      // await prisma.someTable.deleteMany({ where: { shop } });
    } catch (dbErr) {
      logger.warn(
        "Shop redact DB cleanup skipped/failed",
        { error: dbErr?.message || String(dbErr) },
        shop
      );
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
