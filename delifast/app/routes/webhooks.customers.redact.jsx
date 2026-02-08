/**
 * Mandatory compliance webhook: customers/redact
 * Shopify sends this when customer data must be deleted/redacted.
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

    const customerId =
      payload?.customer?.id != null ? String(payload.customer.id) : null;

    if (customerId) {
      try {
        // Optional: delete/redact customer data if you store any
        // await prisma.customerData.deleteMany({ where: { shop, customerId } });
      } catch (dbErr) {
        logger.warning(
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
