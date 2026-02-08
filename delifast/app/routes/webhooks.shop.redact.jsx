/**
 * Mandatory compliance webhook: shop/redact
 * Shopify sends this when shop data must be deleted after uninstall / request.
 */

import { authenticate } from "../shopify.server";
import { logger } from "../services/logger.server";

export const action = async ({ request }) => {
  try {
    const { shop, topic, payload } = await authenticate.webhook(request);

    logger.info(`Received ${topic} compliance webhook`, { shop }, shop);

    // IMPORTANT: dynamic import عشان build
    const { default: prisma } = await import("../db.server");

    // امسح بيانات المتجر
    // عدّل حسب Prisma model names عندك
    await prisma.shipment.deleteMany({ where: { shop } }).catch(() => {});
    await prisma.storeSettings.deleteMany({ where: { shop } }).catch(() => {});
    await prisma.log.deleteMany({ where: { shop } }).catch(() => {});
    await prisma.session.deleteMany({ where: { shop } }).catch(() => {});

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
