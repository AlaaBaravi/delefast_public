import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`Order paid in ${shop}`);
    console.log(payload);

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("WEBHOOK orders/paid failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
