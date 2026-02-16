import { authenticate } from "../shopify.server";
import { handleOrderUpdated } from "../services/orderHandler.server";

export const action = async ({ request }) => {
  try {
    const { shop, payload } = await authenticate.webhook(request);
    await handleOrderUpdated(shop, payload);
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("WEBHOOK orders/updated failed:", e);
    return new Response("unauthorized", { status: 401 });
  }
};
