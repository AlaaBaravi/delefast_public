import fetch from 'node-fetch';
import crypto from 'crypto';
import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';

// Shopify authentication function: returns a Shopify API client
export const authenticate = async (shop, code) => {
  try {
    // Exchange authorization code for access token
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET_KEY,
        code,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Authentication failed: ${JSON.stringify(data)}`);
    }

    // Build a Shopify API client using the access token
    const shopify = shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecretKey: process.env.SHOPIFY_API_SECRET_KEY,
      scopes: process.env.SCOPES.split(','),
      hostName: process.env.SHOPIFY_APP_URL.replace(/^https?:\/\//, ''),
      apiVersion: LATEST_API_VERSION,
    });

    const session = {
      id: `${shop}_${Date.now()}`,
      shop,
      state: 'state',
      isOnline: true,
      accessToken: data.access_token,
    };

    return {
      client: {
        rest: new shopify.clients.Rest({ session }),
        graphql: new shopify.clients.Graphql({ session }),
      },
      token: data.access_token,
    };
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

// Adding custom response headers for Shopify (useful for SSR or API responses)
export const addDocumentResponseHeaders = (headers = {}) => {
  const validHeaders = {};

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      if (typeof key === 'string' && typeof value === 'string') {
        validHeaders[key] = value;
      }
    });
  } else {
    for (const [key, value] of Object.entries(headers)) {
      if (typeof key === 'string' && typeof value === 'string') {
        validHeaders[key] = value;
      } else {
        console.warn(`Invalid header key or value: ${String(key)} => ${value}`);
      }
    }
  }

  validHeaders['X-Shopify-Shop-Domain'] =
    process.env.SHOPIFY_SHOP_DOMAIN || 'unknown';
  validHeaders['X-Shopify-App-Bridge'] = 'true';

  return new Headers(validHeaders);
};

// Shopify login function (newly added)
export const login = async (request) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get('shop');

  if (shop) {
    const redirectUri = `${process.env.SHOPIFY_APP_URL}/auth/callback`; // Your callback URL
    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${process.env.SCOPES}&redirect_uri=${redirectUri}&state=random_state_value`;

    return { redirectUrl: authUrl };
  }

  return { error: 'No shop parameter found in the request URL' };
};
