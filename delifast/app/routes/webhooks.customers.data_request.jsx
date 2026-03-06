import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log(`Webhook received: ${topic} from ${shop}`);
    console.log("Payload:", payload);

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("WEBHOOK customers/data_request failed:", error);
    return new Response("Unauthorized", { status: 401 });
  }
};
