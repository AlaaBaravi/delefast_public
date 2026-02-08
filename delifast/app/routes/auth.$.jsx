import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, registerWebhooks } from "../shopify.server";

export const loader = async ({ request }) => {
  // This completes OAuth and returns admin + session
  const { session } = await authenticate.admin(request);

  // ✅ Register all webhooks defined in shopify.server.js
  // This is what Shopify’s automated checks expect
  await registerWebhooks({ session });

  return null;
};

export const headers = (headersArgs) => boundary.headers(headersArgs);
