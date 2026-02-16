import { authenticate } from "../shopify.server";
import { handleOrderCreated } from "../services/orderHandler.server";

export const action = async ({ request }) => {
  try {
    const { shop, payload, admin } = await authenticate.webhook(request);
    await handleOrderCreated(shop, payload, admin);
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("Webhook ORDERS_CREATE failed:", e);
    return new Response("unauthorized", { status: 401 });
  }
};
