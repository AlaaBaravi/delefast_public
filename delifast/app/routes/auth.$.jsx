import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { registerMandatoryWebhooks } from "../webhooks.register.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  // ✅ Register mandatory GDPR webhooks right after install/auth
  await registerMandatoryWebhooks(session);

  return null;
};

export const headers = (args) => boundary.headers(args);
