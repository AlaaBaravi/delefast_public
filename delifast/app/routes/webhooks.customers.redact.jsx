/**
 * Mandatory compliance webhook: customers/redact
 * Shopify sends this when customer data must be deleted/redacted.
 */

import { authenticate } from "../shopify.server";
import { logger } from "../services/logger.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  try {
    const { shop, topic, payload } = await authenticate.webhook(request);

    logger.info(`Received ${topic} compliance webhook`, {
      shop,
      payload,
    }, shop);

    // ✅ اختياري (لو بتخزن بيانات العميل عندك)
    // payload غالبًا يحتوي customer.id (وقد يحتوي customer.email)
    const customerId =
      payload?.customer?.id != null ? String(payload.customer.id) : null;

    if (customerId) {
      // مثال: امسح أي بيانات مرتبطة بالعميل في DB عندك (لو موجودة)
      // عدّل الجداول حسب مشروعك
      // هنا مثال آمن: لا يرمي خطأ لو مفيش جدول/علاقة
      try {
        // ضع هنا منطق الحذف/الريدآكت لو عندك تخزين بيانات عملاء
        // await prisma.customerData.deleteMany({ where: { shop, customerId } });
      } catch (dbErr) {
        logger.warning("Customer redact DB cleanup skipped/failed", {
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
