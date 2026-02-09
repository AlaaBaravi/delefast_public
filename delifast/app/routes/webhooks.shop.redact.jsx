import { verifyWebhook } from "../webhooks.verify.server";

export const action = async ({ request }) => {
  await verifyWebhook(request);
  return new Response("OK", { status: 200 });
};
