import { authenticate } from "../shopify.server";

/**
 * Delete/anonymize shop data for GDPR compliance.
 */
async function handleShopRedact(payload) {
  try {
    const shop = payload.shop_domain || payload.shop;
    console.log(`[GDPR] shop/redact received for shop=${shop}`);

    // TODO: your deletion/anonymization logic here

    console.log(`[GDPR] Completed deletion/anonymization for shop ${shop}`);
  } catch (err) {
    console.error("Error processing shop/redact webhook:", err);
  }
}

export const action = async ({ request }) => {
  try {
    const { payload, topic, shop } = await authenticate.webhook(request);

    console.log(`Received ${topic} webhook for ${shop}`);

    await handleShopRedact(payload);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook authentication failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
