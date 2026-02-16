/**
 * App Layout
 * Main layout component for the Delifast Shopify App
 */

import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { registerMandatoryWebhooks } from "../webhooks.register.server";

// ✅ Register webhooks only ONCE per shop per server runtime (prevents duplicates)
const registeredShops = globalThis.__registeredShops || new Set();
globalThis.__registeredShops = registeredShops;

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);

  // ✅ Only on /app (not /app.data, not /app/orders.data, etc)
  // ✅ Only once per shop to avoid duplicate webhook subscriptions
  if (url.pathname === "/app" && session?.shop && !registeredShops.has(session.shop)) {
    try {
      await registerMandatoryWebhooks(session);
      registeredShops.add(session.shop);
      console.log(`[WEBHOOKS] Registered for shop: ${session.shop}`);
    } catch (err) {
      console.error("[WEBHOOKS] Registration failed:", err);
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

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
