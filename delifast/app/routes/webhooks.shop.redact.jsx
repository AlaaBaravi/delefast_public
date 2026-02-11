// File: webhooks.shop.redact.jsx

import { verifyShopifyWebhook } from "../webhooks.verify.server";

/**
 * Background worker to delete/anonymize shop data for GDPR compliance.
 * Replace the placeholder logic with your DB and third-party deletion steps.
 */
async function handleShopRedact(payload) {
  try {
    // Example payload fields: { shop_domain, shop, ... }
    const shop = payload.shop_domain || payload.shop;
    console.log(`[GDPR] shop/redact received for shop=${shop}`);

    // TODO: Implement actual deletion/anonymization:
    // - Remove or anonymize merchant/shop records in your DB (settings, tokens, stored data)
    // - Remove or anonymize copies in third-party services (analytics, backups)
    // - Revoke API tokens and clear persistent sessions
    // - Record an audit entry: { shop, timestamp, actionsTaken }
    //
    // Example pseudo-steps:
    // await db.shops.delete({ domain: shop });
    // await thirdPartyService.removeShopData(shop);
    // await auditLog.create({ shop, action: 'shop_redact', status: 'completed' });

    console.log(`[GDPR] Completed deletion/anonymization for shop ${shop}`);
  } catch (err) {
    console.error("Error processing shop/redact webhook:", err);
    // Log failure for manual review and retry if necessary
  }
}

export const action = async ({ request }) => {
  try {
    // Read raw body from a clone so we can parse it after verification.
    const rawBody = await request.clone().text();

    // Verify HMAC using the original request
    const verification = await verifyShopifyWebhook(request);
    if (!verification.ok) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Acknowledge immediately to Shopify
    const response = new Response("OK", { status: 200 });

    // Process deletion asynchronously
    setImmediate(() => {
      try {
        const payload = rawBody ? JSON.parse(rawBody) : {};
        handleShopRedact(payload);
      } catch (err) {
        console.error("Failed to parse shop/redact payload:", err);
      }
    });

    return response;
  } catch (error) {
    console.error("Webhook verification or handling failed:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
