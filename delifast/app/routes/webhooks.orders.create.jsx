import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  try {
    const { shop, payload } = await authenticate.webhook(request);

    const order = payload;

    console.log(`Creating shipment for order ${order.order_number}`);

    await db.shipment.create({
      data: {
        shop: shop,
        shopifyOrderId: order.id.toString(),
        shopifyOrderNumber: order.order_number.toString(),
        shipmentId: `TEMP-${order.id}`,
        status: "new",
        isTemporaryId: true,
        sentAt: new Date(),
      },
    });

    console.log("Shipment saved to database");

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("WEBHOOK orders/create failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
