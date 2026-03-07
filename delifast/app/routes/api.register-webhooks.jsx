import { authenticate, registerWebhooks } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  await registerWebhooks({ session });

  console.log("WEBHOOKS REGISTERED");

  return new Response("registered");
};
