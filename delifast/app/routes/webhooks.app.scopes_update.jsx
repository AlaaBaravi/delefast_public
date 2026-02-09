import { verifyShopifyWebhook } from "../webhooks.verify.server";

export const action = async ({ request }) => {
  try {
    const v = await verifyShopifyWebhook(request); // Verifying webhook

    if (!v.ok) {
      return new Response("Unauthorized", { status: 401 });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    // Catching any errors that happen during verification
    console.error("Webhook verification failed:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
