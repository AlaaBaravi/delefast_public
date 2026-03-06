import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, registerWebhooks } from "../shopify.server";

export const loader = async ({ request }) => {
  const authResult = await authenticate.admin(request);

  const session = authResult.session;

  await registerWebhooks({ session });

  console.log(`Webhooks registered for ${session.shop}`);

  return null;
};

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
