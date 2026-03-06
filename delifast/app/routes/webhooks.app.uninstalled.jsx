import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  try {
    const { shop, session, topic } = await authenticate.webhook(request);

    console.log(`Webhook received: ${topic} from ${shop}`);

    // This webhook fires when the app is removed from the store
    if (session) {
      await db.session.deleteMany({
        where: { shop },
      });
    }

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("WEBHOOK app/uninstalled failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
