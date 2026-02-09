import { verifyWebhook } from "../webhooks.verify.server";

export const action = async ({ request }) => {
  try {
    // Verify the webhook
    const v = await verifyWebhook(request);

    // If the verification failed, return Unauthorized response
    if (!v.ok) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Proceed with the rest of the action
    // You can add your logic here if needed
    return new Response("OK", { status: 200 });
  } catch (error) {
    // If something goes wrong (e.g., invalid signature), handle the error
    console.error("Webhook verification failed:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
