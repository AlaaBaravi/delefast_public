import { authenticate } from "../shopify.server";
import { registerAllWebhooks } from "../webhooks.register.server";

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  await registerAllWebhooks(session);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
