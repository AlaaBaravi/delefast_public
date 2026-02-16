/**
 * App Layout
 * Main layout component for the Delifast Shopify App
 */

import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { registerMandatoryWebhooks } from "../webhooks.register.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  // register webhooks only on /app (avoid repeated registration on *.data requests)
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

export const headers = (headersArgs) => boundary.headers(headersArgs);
