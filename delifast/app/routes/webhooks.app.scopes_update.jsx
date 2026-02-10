// app/routes/webhooks.app.scopes_update.jsx

import { verifyShopifyWebhook } from "../webhooks.verify.server";
import { redirect } from "react-router";

// Action handler for webhook verification
export const action = async ({ request }) => {
  try {
    const v = await verifyShopifyWebhook(request);  // Verifying webhook

    if (!v.ok) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Your logic to process the webhook (update scopes or settings, etc.)

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook verification failed:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
