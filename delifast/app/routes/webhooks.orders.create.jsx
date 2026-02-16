import { authenticate } from "../shopify.server";
import { handleOrderCreated } from "../services/orderHandler.server";

export async function action({ request }) {
  try {
    const { shop, admin, payload } = await authenticate.webhook(request);

    const order = typeof payload === "string" ? JSON.parse(payload) : payload;

    await handleOrderCreated(shop, order, admin);

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("orders/create webhook error:", err);
    // Shopify will retry if not 200
    return new Response("Unauthorized", { status: 401 });
  }
}
