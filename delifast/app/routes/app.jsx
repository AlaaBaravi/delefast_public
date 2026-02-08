import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { registerWebhooks } from "../webhooks.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  // 🔑 REGISTER WEBHOOKS HERE (AFTER auth)
  await registerWebhooks(admin);

  return { apiKey: process.env.SHOPIFY_API_KEY };
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
