// File: webhooks.customers.data_request.jsx

import { verifyShopifyWebhook } from "../webhooks.verify.server";

/**
 * Minimal async handler for customers/data_request webhook.
 *
 * Behavior:
 * - Read raw body from a cloned request so we can both verify HMAC and parse payload.
 * - Verify HMAC using verifyShopifyWebhook(request).
 * - Immediately respond with 200 on verified requests.
 * - Process the payload asynchronously (delete/anonymize/export logic goes here).
 */

async function handleDataRequest(payload) {
  try {
    // payload contains fields Shopify sends for customers/data_request
    // Example payload shape: { shop_domain, customer: { id, email, ... }, ... }
    // Implement the logic to gather all personal data you hold for the given customer,
    // create a secure export (file or signed URL), and notify the merchant or store it
    // where the merchant can retrieve it.
    //
    // IMPORTANT (production):
    // - Ensure exported data includes everything you store about the customer:
    //   orders, profiles, analytics, metadata, third-party copies, logs, etc.
    // - Store an audit record that you fulfilled the request (timestamp, shop, customer id).
    // - Use secure storage and short-lived signed URLs if you provide a download link.
    //
    // The code below is a placeholder. Replace with your real export logic.

    const shop = payload.shop_domain || payload.shop;
    const customer = payload.customer || payload;
    console.log(`[GDPR] customers/data_request received for shop=${shop}, customerId=${customer?.id}`);

    // Example: gather data from DB and third-party services (pseudo)
    // const customerData = await gatherCustomerData(shop, customer.id);
    // const exportUrl = await uploadExportAndGetSignedUrl(customerData);

    // For now, just log that we'd create an export
    console.log(`[GDPR] Would generate export for customer ${customer?.id} and notify merchant.`);
  } catch (err) {
    // Log errors for audit; do not throw (we already acknowledged)
    console.error("Error processing customers/data_request webhook:", err);
  }
}

export const action = async ({ request }) => {
  try {
    // Read raw body from a clone so we can parse it after verification.
    // Cloning avoids consuming the original request body before verifyShopifyWebhook reads it.
    const rawBody = await request.clone().text();

    // Verify HMAC using the original request (verifyShopifyWebhook reads request.text())
    const verification = await verifyShopifyWebhook(request);
    if (!verification.ok) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Acknowledge immediately
    const response = new Response("OK", { status: 200 });

    // Process asynchronously so we don't block Shopify's webhook delivery
    // Use setImmediate / setTimeout 0 to schedule background work
    setImmediate(() => {
      try {
        const payload = rawBody ? JSON.parse(rawBody) : {};
        handleDataRequest(payload);
      } catch (err) {
        console.error("Failed to parse customers/data_request payload:", err);
      }
    });

    return response;
  } catch (error) {
    console.error("Webhook verification or handling failed:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
