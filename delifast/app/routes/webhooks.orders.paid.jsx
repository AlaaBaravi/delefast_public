import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`Order paid in ${shop}`);

    const order = payload;

    await db.order.updateMany({
      where: {
        shopifyOrderId: order.id.toString(),
      },
      data: {
        status: "paid",
      },
    });

    console.log("Order marked as paid");

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("WEBHOOK orders/paid failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
