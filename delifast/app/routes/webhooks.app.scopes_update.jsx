import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  let payload;
  let session;
  let topic;
  let shop;

  try {
    const authResult = await authenticate.webhook(request);
    payload = authResult.payload;
    session = authResult.session;
    topic = authResult.topic;
    shop = authResult.shop;
  } catch (error) {
    console.error("Webhook authentication failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }

  console.log(`Received ${topic} webhook for ${shop}`);

  const current = payload?.current;

  try {
    if (session && current != null) {
      await db.session.update({
        where: { id: session.id },
        data: { scope: String(current) },
      });
    }
  } catch (error) {
    console.error("Failed to update session scope on scopes_update:", error);
    // Return 200 anyway to avoid endless retries
  }

  return new Response("OK", { status: 200 });
};
