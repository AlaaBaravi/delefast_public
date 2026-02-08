export const action = async ({ request }) => {
  const [{ authenticate }, { default: prisma }] = await Promise.all([
    import("../shopify.server"),
    import("../db.server"),
  ]);

  try {
    const { shop } = await authenticate.webhook(request);

    // Optional: delete all shop-related data
    // await prisma.shop.delete({ where: { shop } });

    return new Response(null, { status: 200 });
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
};
