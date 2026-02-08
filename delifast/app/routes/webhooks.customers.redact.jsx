/**
 * Mandatory compliance webhook: customers/redact
 * Shopify sends this when customer data must be deleted/redacted.
 */

import { authenticate } from "../shopify.server";
import { logger } from "../services/logger.server";

export const action = async ({ request }) => {
  try {
    const { shop, topic, payload } = await authenticate.webhook(request);

    logger.info(`Received ${topic} compliance webhook`, { shop }, shop);

    const customerId =
      payload?.customer?.id != null ? String(payload.customer.id) : null;

    // ✅ لو عندك فعلاً بيانات عميل بتخزنها، اعمل cleanup هنا
    // IMPORTANT: dynamic import عشان ما يكسرش build
    if (customerId) {
      try {
        const { default: prisma } = await import("../db.server");

        // مثال: امسح أي data مرتبطة بالعميل (عدّل حسب جداولك)
        // لو ما عندكش جدول customerData سيبها commented
        // await prisma.customerData.deleteMany({ where: { shop, customerId } });

      } catch (dbErr) {
        logger.warning("customers/redact DB cleanup skipped/failed", {
          error: dbErr?.message || String(dbErr),
          customerId,
        }, shop);
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
