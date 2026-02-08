import { authenticate, registerWebhooks } from "../shopify.server";

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  if (!session?.shop) {
    return new Response("No session", { status: 401 });
  }

  await registerWebhooks({ session });

  return new Response("Webhooks registered", { status: 200 });
};
