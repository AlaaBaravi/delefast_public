import crypto from "crypto";

export async function verifyWebhook(request) {
  const rawBody = await request.text();

  const hmac = request.headers.get("X-Shopify-Hmac-Sha256") || "";
  const generated = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");

  if (generated !== hmac) {
    throw new Response("Unauthorized", { status: 401 });
  }

  // Shopify sends JSON
  return JSON.parse(rawBody);
}
