import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { registerMandatoryWebhooks } from "../webhooks.register.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  // Register webhooks only once per shop
  try {
    if (session?.shop) {
      const shop = session.shop;

      // Create a tiny table/flag record OR reuse an existing settings table if you have one.
      // This assumes you have a "shopSettings" table. If you don't, tell me what tables you have in Prisma.
      const existing = await db.shopSettings?.findUnique?.({ where: { shop } });

      if (!existing?.webhooksRegistered) {
        await registerMandatoryWebhooks(session);

        if (db.shopSettings?.upsert) {
          await db.shopSettings.upsert({
            where: { shop },
            create: { shop, webhooksRegistered: true },
            update: { webhooksRegistered: true },
          });
        }
      }
    }
  } catch (err) {
    console.error("Webhook registration failed:", err);
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
