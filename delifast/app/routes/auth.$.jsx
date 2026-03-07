import { authenticate, forceRegisterWebhooks } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  await forceRegisterWebhooks(session);

  console.log("Webhooks forced registration complete");

  return null;
};
