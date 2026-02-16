import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return new Response(null, { status: 204 });
};

export const headers = (headersArgs) => boundary.headers(headersArgs);
