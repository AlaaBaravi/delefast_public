import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  let shop;
  let session;
  let topic;

  try {
    const authResult = await authenticate.webhook(request);
    shop = authResult.shop;
    session = authResult.session;
    topic = authResult.topic;
  } catch (error) {
    console.error("Webhook authentication failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  try {
    if (session) {
      await db.session.deleteMany({ where: { shop } });
    }
  } catch (error) {
    console.error("Failed to delete sessions on app/uninstalled:", error);
    // Return 200 anyway so Shopify doesn't retry forever
  }

  return new Response("OK", { status: 200 });
};
