// app/shopify.server.js

import fetch from 'node-fetch';
import crypto from 'crypto';

// Shopify authentication function
export const authenticate = async (shop) => {
  try {
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET_KEY,
        code: 'authorization_code_from_shop',
      }),
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {
    console.error('Error during authentication', error);
    throw error;
  }
};

// Verifying Shopify webhook using HMAC
export const verifyShopifyWebhook = async (request) => {
  const hmacHeader = request.headers.get('X-Shopify-Hmac-Sha256');
  const body = await request.text();
  const secret = process.env.SHOPIFY_API_SECRET_KEY;

  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  const isVerified = hash === hmacHeader;
  return { ok: isVerified };
};
