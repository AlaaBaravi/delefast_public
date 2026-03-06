import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`Order updated in ${shop}`);

    const order = payload;

    await db.order.updateMany({
      where: {
        shopifyOrderId: order.id.toString(),
      },
      data: {
        email: order.email || "",
        totalPrice: order.total_price || "0",
      },
    });

    console.log("Order updated in database");

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("WEBHOOK orders/updated failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
