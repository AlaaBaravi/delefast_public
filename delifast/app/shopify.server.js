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

// Adding custom response headers for Shopify (useful for SSR or API responses)
export const addDocumentResponseHeaders = (headers) => {
  const newHeaders = new Headers(headers || {});

  // Ensure header keys are strings
  const validHeaders = Object.entries(newHeaders).reduce((acc, [key, value]) => {
    if (typeof key === 'string' && typeof value === 'string') {
      acc[key] = value;
    } else {
      console.warn(`Invalid header key or value: ${key} => ${value}`);
    }
    return acc;
  }, {});

  // Set Shopify-specific headers
  validHeaders['X-Shopify-Shop-Domain'] = process.env.SHOPIFY_SHOP_DOMAIN || 'unknown';
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
