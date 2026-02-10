// app/webhooks.verify.server.js

import crypto from 'crypto';

// Function to verify the Shopify webhook using HMAC
export const verifyShopifyWebhook = async (request) => {
  const hmacHeader = request.headers.get('X-Shopify-Hmac-Sha256');
  const body = await request.text();
  const secret = process.env.SHOPIFY_API_SECRET_KEY;  // Your secret key

  // Generate the HMAC hash from the request body and compare with the header
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  const isVerified = hash === hmacHeader;

  return {
    ok: isVerified,
  };
};
