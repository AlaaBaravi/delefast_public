/**
 * Mandatory compliance webhook: customers/data_request
 * Shopify sends this when a customer requests their stored data.
 *
 * Shopify mainly checks:
 * - endpoint exists
 * - HMAC verification
 * - returns 2xx on success, 401 on invalid HMAC
 */
export const action = async ({ request }) => {
  const [{ authenticate }, { logger }] = await Promise.all([
    import("../shopify.server"),
    import("../services/logger.server"),
  ]);

  try {
    const { shop, topic, payload } = await authenticate.webhook(request);

    logger.info(
      `Received ${topic} compliance webhook`,
      { shop, payload },
      shop
    );

    // If you store customer data, you would prepare it for the merchant here.
    // Shopify does not require you to return the data in the webhook response.

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
