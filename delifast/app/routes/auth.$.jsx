import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, registerWebhooks } from "../shopify.server";

export const loader = async ({ request }) => {
  // ✅ This returns session info after install/login
  const { session } = await authenticate.admin(request);

  // ✅ Register mandatory + your app webhooks after install
  // (safe to call multiple times)
  if (session) {
    await registerWebhooks({ session });
  }

  return null;
};

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
