export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  // ✅ Register only when it's the main /app route
  const url = new URL(request.url);

  if (url.pathname === "/app") {
    try {
      await registerMandatoryWebhooks(session);
    } catch (err) {
      console.error("Webhook registration failed:", err);
    }
  }

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};
