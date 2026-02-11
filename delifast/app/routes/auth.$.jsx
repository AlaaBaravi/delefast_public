import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { registerMandatoryWebhooks } from "../webhooks.register.server";
import { redirect } from "react-router-dom";

/**
 * Loader for auth.$ route
 *
 * - Extracts shop and code from the incoming request URL
 * - Calls authenticate.admin(shop, code) which returns { client, session } (or { client: null, session: null })
 * - If no session is available, redirects to the login flow to start OAuth
 * - After successful authentication, registers mandatory GDPR webhooks
 */
export const loader = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    const code = url.searchParams.get("code");

    // Call authenticate.admin with shop and code (supports code exchange or session fallback)
    const result = await authenticate.admin(shop, code);
    const { session } = result || {};

    // If we don't have a session, redirect to the login route to start OAuth
    if (!session) {
      const loginPath = `/auth/login?shop=${encodeURIComponent(shop || "")}`;
      return redirect(loginPath);
    }

    // Register mandatory GDPR webhooks after install/auth
    await registerMandatoryWebhooks(session);

    // Return null (or any loader data you need)
    return null;
  } catch (err) {
    // Log server-side for debugging; return a 500 response so the app shows an error boundary
    console.error("auth.$ loader error:", err);
    throw new Response("Unexpected Server Error", { status: 500 });
  }
};

export const headers = (args) => boundary.headers(args);
