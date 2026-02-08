export const action = async ({ request }) => {
  const [{ authenticate }, { logger }, { default: prisma }] = await Promise.all([
    import("../shopify.server"),
    import("../services/logger.server"),
    import("../db.server"),
  ]);

  try {
    const { shop, topic, payload } = await authenticate.webhook(request);

    const customerId = payload?.customer?.id
      ? String(payload.customer.id)
      : null;

    if (customerId) {
      // Optional: delete/redact customer data if you store it
      // await prisma.customerData.deleteMany({ where: { shop, customerId } });
    }

    return new Response(null, { status: 200 });
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
};
