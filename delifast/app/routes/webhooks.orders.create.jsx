import { authenticate } from "../shopify.server";
import { handleOrderCreated } from "../services/orderHandler.server";

export const action = async ({ request }) => {
  try {
    const { topic, shop, payload, admin } = await authenticate.webhook(request);

    console.log(`Order created webhook received from ${shop}`);

    await handleOrderCreated(shop, payload, admin);

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("WEBHOOK orders/create failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
