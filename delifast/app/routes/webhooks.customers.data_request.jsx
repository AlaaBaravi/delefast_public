export const loader = async () => {
  return new Response("Method Not Allowed", { status: 405 });
};

export const action = async ({ request }) => {
  const [{ authenticate }, { logger }] = await Promise.all([
    import("../shopify.server"),
    import("../services/logger.server"),
  ]);

  try {
    await authenticate.webhook(request);
    return new Response(null, { status: 200 });
  } catch (error) {
    logger?.error?.("Webhook auth failed", { error: error?.message || String(error) });
    return new Response("Unauthorized", { status: 401 });
  }
};
