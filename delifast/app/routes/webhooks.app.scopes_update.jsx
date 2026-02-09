import { verifyWebhook } from "../webhooks.verify.server";

export const action = async ({ request }) => {
  const v = await verifyShopifyWebhook(request);
  if (!v.ok) return new Response("Unauthorized", { status: 401 });

  return new Response("OK", { status: 200 });
};
