import { authenticate } from "../shopify.server";
import { handleOrderPaid } from "../services/orderHandler.server";

export async function action({ request }) {
  try {
    const { shop, admin, payload } = await authenticate.webhook(request);

    const order = typeof payload === "string" ? JSON.parse(payload) : payload;

    await handleOrderPaid(shop, order, admin);

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("orders/paid webhook error:", err);
    return new Response("Unauthorized", { status: 401 });
  }
}
