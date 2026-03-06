import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`Order created in ${shop}`);

    const order = payload;

    await db.order.create({
      data: {
        shop: shop,
        shopifyOrderId: order.id.toString(),
        orderNumber: order.order_number.toString(),
        email: order.email || "",
        totalPrice: order.total_price || "0",
        status: "new"
      }
    });

    console.log("Order saved to database");

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("WEBHOOK orders/create failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
