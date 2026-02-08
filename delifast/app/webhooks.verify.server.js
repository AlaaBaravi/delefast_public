import crypto from "crypto";

export async function verifyShopifyWebhook(request) {
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shop = request.headers.get("x-shopify-shop-domain");

  const bodyText = await request.text();
  const secret = process.env.SHOPIFY_API_SECRET || "";

  const digest = crypto
    .createHmac("sha256", secret)
    .update(bodyText, "utf8")
    .digest("base64");

  const safeEqual =
    hmac &&
    digest &&
    crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(digest));

  return {
    ok: Boolean(safeEqual),
    topic,
    shop,
    bodyText,
  };
}
