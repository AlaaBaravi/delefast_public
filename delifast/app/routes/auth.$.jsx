import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, registerWebhooks } from "../shopify.server";

export const loader = async ({ request }) => {
  // ✅ لازم نمسك session اللي راجع من authenticate
  const { session } = await authenticate.admin(request);

  // ✅ دي اللي بتسجّل webhooks في Shopify (مرة واحدة لكل متجر)
  await registerWebhooks({ session });

  return null;
};

export const headers = (headersArgs) => boundary.headers(headersArgs);
