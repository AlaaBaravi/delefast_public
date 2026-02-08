/**
 * Mandatory compliance webhook: shop/redact
 * Shopify sends this when shop data must be deleted after uninstall / request.
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

    // ✅ هنا غالبًا لازم تمسح بيانات المتجر من DB
    // (Sessions / StoreSettings / Shipments / Logs ...)
    try {
      await prisma.shipment.deleteMany({ where: { shop } });
    } catch (e) {
      logger.warning("shop/redact: shipment cleanup skipped/failed", {
        error: e?.message || String(e),
      }, shop);
    }

    try {
      await prisma.storeSettings.deleteMany({ where: { shop } });
    } catch (e) {
      logger.warning("shop/redact: storeSettings cleanup skipped/failed", {
        error: e?.message || String(e),
      }, shop);
    }

    try {
      await prisma.log.deleteMany({ where: { shop } });
    } catch (e) {
      logger.warning("shop/redact: log cleanup skipped/failed", {
        error: e?.message || String(e),
      }, shop);
    }

    try {
      await prisma.session.deleteMany({ where: { shop } });
    } catch (e) {
      logger.warning("shop/redact: session cleanup skipped/failed", {
        error: e?.message || String(e),
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
