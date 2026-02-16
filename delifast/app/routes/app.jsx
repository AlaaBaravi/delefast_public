import { Outlet } from "react-router";
import { authenticate } from "../shopify.server";
import { registerMandatoryWebhooks } from "../webhooks.register.server";

export async function loader({ request }) {
  // This returns admin + session (offline session usually)
  const { session } = await authenticate.admin(request);

  // Register webhooks safely (idempotent)
  await registerMandatoryWebhooks(session);

  return null;
}

export default function App() {
  return <Outlet />;
}
