export const loader = async () => {
  // Browsers/Shopify checks may hit this with GET — don’t crash
  return new Response("Method Not Allowed", { status: 405 });
};

export const action = async ({ request }) => {
  const [{ authenticate }, { logger }, { default: prisma }] = await Promise.all([
    import("../shopify.server"),
    import("../services/logger.server"),
    import("../db.server"),
  ]);

  try {
    const { shop, topic, payload } = await authenticate.webhook(request);

    const customerId =
      payload?.customer?.id != null ? String(payload.customer.id) : null;

    if (customerId) {
      // Optional: delete/redact your stored customer data here
      // await prisma.customerData.deleteMany({ where: { shop, customerId } });
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    // IMPORTANT: Invalid HMAC must return 401 (Shopify checks this)
    logger?.error?.("Webhook auth failed", { error: error?.message || String(error) });
    return new Response("Unauthorized", { status: 401 });
  }
};
