// app/webhooks.verify.server.js

import crypto from 'crypto';

export const verifyShopifyWebhook = async (request) => {
  const hmacHeader = request.headers.get('X-Shopify-Hmac-Sha256');
  const body = await request.text();  // Get raw body content of the request
  const secret = process.env.SHOPIFY_API_SECRET_KEY;  // Set your secret key

  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  const isVerified = hash === hmacHeader;

  return {
    ok: isVerified,
  };
};
