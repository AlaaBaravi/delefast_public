// File: webhooks.customers.redact.jsx

import { verifyShopifyWebhook } from "../webhooks.verify.server";

/**
 * Background worker to delete/anonymize customer data for GDPR compliance.
 * Replace the placeholder logic with your DB and third-party deletion steps.
 */
async function handleCustomerRedact(payload) {
  try {
    // Example payload fields: { shop_domain, customer: { id, email, ... }, ... }
    const shop = payload.shop_domain || payload.shop;
    const customer = payload.customer || payload;

    console.log(`[GDPR] customers/redact received for shop=${shop}, customerId=${customer?.id}`);

    // TODO: Implement actual deletion/anonymization:
    // - Remove or anonymize customer records in your DB (users, orders metadata, analytics)
    // - Remove or anonymize copies in third-party services (CRMs, analytics, backups)
    // - Remove any personally identifying logs or references
    // - Record an audit entry: { shop, customerId, timestamp, actionsTaken }
    //
    // Example pseudo-steps:
    // await db.users.update({ shop, customerId }, { email: null, name: 'redacted', ... });
    // await thirdPartyService.deleteCustomer(customer.id);
    // await auditLog.create({ shop, customerId, action: 'customers_redact', status: 'completed' });

    console.log(`[GDPR] Completed deletion/anonymization for customer ${customer?.id}`);
  } catch (err) {
    console.error("Error processing customers/redact webhook:", err);
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
        handleCustomerRedact(payload);
      } catch (err) {
        console.error("Failed to parse customers/redact payload:", err);
      }
    });

    return response;
  } catch (error) {
    console.error("Webhook verification or handling failed:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
