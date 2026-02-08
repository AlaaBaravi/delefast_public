import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, registerWebhooks } from "../shopify.server";

export const loader = async ({ request }) => {
  // Authenticate and get the full auth result (session + admin client, etc.)
  const authResult = await authenticate.admin(request);

  // Register all webhooks defined in shopify.server.js
  // (customers/data_request, customers/redact, shop/redact, orders/*, etc.)
  await registerWebhooks(authResult);

  // Continue the auth flow (you can redirect to your app)
  return new Response(null, { status: 204 });
};

export const headers = (headersArgs) => boundary.headers(headersArgs);
