// app/shopify.server.js

// Adding custom response headers for Shopify (useful for SSR or API responses)
export const addDocumentResponseHeaders = (headers) => {
  // Create a valid Headers object, if headers is not already one.
  const newHeaders = new Headers(headers || {});  // Ensuring headers is an object

  // Set the custom Shopify headers
  newHeaders.set('X-Shopify-Shop-Domain', process.env.SHOPIFY_SHOP_DOMAIN); // Your Shopify store domain
  newHeaders.set('X-Shopify-App-Bridge', 'true');

  return newHeaders;
};
