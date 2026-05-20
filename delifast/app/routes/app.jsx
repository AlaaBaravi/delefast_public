/**
 * App Layout
 * Main layout component for the Delifast Shopify App
 */

import { Outlet, useLoaderData, useRouteError } from "react-router";
import { useEffect } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();

  useEffect(() => {
    let cancelled = false;

    const pingSessionTokenEndpoint = async () => {
      try {
        if (typeof window === "undefined" || !window.shopify?.idToken) {
          return;
        }

        const token = await window.shopify.idToken();

        if (cancelled || !token) {
          return;
        }

        await fetch("/app/session-check", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ source: "embedded-session-token-check" }),
        });
      } catch (error) {
        console.warn("Session token check failed", error);
      }
    };

    pingSessionTokenEndpoint();

    return () => {
      cancelled = true;
    };
  }, []);

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
