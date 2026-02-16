// File: app/routes/webhooks.shop.redact.jsx

import { verifyShopifyWebhookFromRaw } from "../webhooks.verify.server";

/**
 * Delete/anonymize shop data for GDPR compliance.
 * Replace placeholder logic with your DB and third-party deletion steps.
 */
async function handleShopRedact(payload) {
  try {
    const shop = payload.shop_domain || payload.shop;
    console.log(`[GDPR] shop/redact received for shop=${shop}`);

    // TODO: Implement deletion/anonymization here

    console.log(`[GDPR] Completed deletion/anonymization for shop ${shop}`);
  } catch (err) {
    console.error("Error processing shop/redact webhook:", err);
  }
}

export const action = async ({ request }) => {
  try {
    // ✅ Read raw body ONCE
    const rawBody = await request.text();

    // ✅ Verify using raw body + headers (no need to re-read request body)
    const verification = await verifyShopifyWebhookFromRaw({
      rawBody,
      hmac: request.headers.get("X-Shopify-Hmac-Sha256"),
      topic: request.headers.get("X-Shopify-Topic"),
      shop: request.headers.get("X-Shopify-Shop-Domain"),
    });

    if (!verification.ok) {
      return new Response("Unauthorized", { status: 401 });
    }

    // ✅ Process (can be sync; Shopify just needs 200 quickly)
    let payload = {};
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch (err) {
      console.error("Failed to parse shop/redact payload:", err);
    }

    await handleShopRedact(payload);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook handling failed:", error);
    // Return 200 if you don't want retries; 500 if you want Shopify to retry.
    return new Response("OK", { status: 200 });
  }
};
