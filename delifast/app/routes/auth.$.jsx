import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { registerAllWebhooks } from "../webhooks.register.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  // Register webhooks AFTER install/auth (offline token exists here)
  await registerAllWebhooks({
    shop: session.shop,
    accessToken: session.accessToken,
    appUrl: process.env.SHOPIFY_APP_URL,
  });

  return null;
};

export const headers = (headersArgs) => boundary.headers(headersArgs);
