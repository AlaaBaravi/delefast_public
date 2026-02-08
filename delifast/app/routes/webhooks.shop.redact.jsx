export const loader = async () => {
  return new Response("Method Not Allowed", { status: 405 });
};

export const action = async ({ request }) => {
  const [{ authenticate }, { logger }, { default: prisma }] = await Promise.all([
    import("../shopify.server"),
    import("../services/logger.server"),
    import("../db.server"),
  ]);

  try {
    const { shop } = await authenticate.webhook(request);

    // Optional: delete shop data you store
    // await prisma.someTable.deleteMany({ where: { shop } });

    return new Response(null, { status: 200 });
  } catch (error) {
    logger?.error?.("Webhook auth failed", { error: error?.message || String(error) });
    return new Response("Unauthorized", { status: 401 });
  }
};
