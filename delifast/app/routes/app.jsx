/**
 * App Layout
 * Main layout component for the Delifast Shopify App
 */

import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate, registerWebhooks } from "../shopify.server";
import { logger } from "../services/logger.server";

export const loader = async ({ request }) => {
  // ✅ MUST return session
  const { session } = await authenticate.admin(request);

  // ✅ Register webhooks (safe to call multiple times)
  try {
    await registerWebhooks({ session });
    logger.info(
      "Webhooks registered from app.jsx loader",
      { shop: session.shop },
      session.shop
    );
  } catch (e) {
    logger.error(
      "Webhook registration failed from app.jsx loader",
      { error: e?.message || String(e), shop: session?.shop },
      session?.shop
    );
  }

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Dashboard</s-link>
        <s-link href="/app/orders">Orders</s-link>
        <s-link href="/app/settings">Settings</s-link>
        <s-link href="/app/logs">Logs</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
