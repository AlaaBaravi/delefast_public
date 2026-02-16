import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    await authenticate.webhook(request);
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("WEBHOOK customers/data_request failed:", e);
    return new Response("unauthorized", { status: 401 });
  }
};
