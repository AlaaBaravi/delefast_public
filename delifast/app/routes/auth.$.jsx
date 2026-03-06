import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, registerWebhooks } from "../shopify.server";

export const loader = async ({ request }) => {
const { session } = await authenticate.admin(request);

  // Register webhooks after OAuth install
  await registerWebhooks({ session });

  console.log(`Webhooks registered for ${session.shop}`);

  return null;
};

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
