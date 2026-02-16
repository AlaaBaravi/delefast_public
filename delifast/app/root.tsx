import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import type { LinksFunction, LoaderFunctionArgs } from "react-router";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "react-router";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: polarisStyles }];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const host = url.searchParams.get("host") || "";

  return {
    apiKey: process.env.SHOPIFY_API_KEY,
    host,
  };
}

export default function Root() {
  const { apiKey, host } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>

      <body>
        <AppProvider isEmbeddedApp apiKey={apiKey} host={host}>
          <Outlet />
        </AppProvider>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
