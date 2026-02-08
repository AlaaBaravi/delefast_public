/**
 * Mandatory compliance webhook: shop/redact
 * Shopify sends this after app uninstall to delete shop data you stored.
 */
export const action = async ({ request }) => {
  const [{ authenticate }, { logger }, { default: prisma }] = await Promise.all([
    import("../shopify.server"),
    import("../services/logger.server"),
    import("../db.server"),
  ]);

  try {
    const { shop, topic, payload } = await authenticate.webhook(request);

    logger.info(
      `Received ${topic} compliance webhook`,
      { shop, payload },
      shop
    );

    // Optional: delete everything you store for this shop
    try {
      // Example ideas (adjust for your schema):
      // await prisma.order.deleteMany({ where: { shop } });
      // await prisma.job.deleteMany({ where: { shop } });
      // await prisma.session.deleteMany({ where: { shop } });
    } catch (dbErr) {
      logger.warning(
        "Shop redact DB cleanup skipped/failed",
        { error: dbErr?.message || String(dbErr) },
        shop
      );
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    logger?.error?.("Compliance webhook authentication failed", {
      error: error?.message || String(error),
      method: request.method,
      url: request.url,
    });

    return new Response("Unauthorized", { status: 401 });
  }
};
