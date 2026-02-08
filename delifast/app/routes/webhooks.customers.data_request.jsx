export const action = async ({ request }) => {
  const [{ authenticate }, { logger }] = await Promise.all([
    import("../shopify.server"),
    import("../services/logger.server"),
  ]);

  try {
    await authenticate.webhook(request);

    // Shopify only checks that you ACK the request
    // You do NOT need to return customer data here

    return new Response(null, { status: 200 });
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
};
