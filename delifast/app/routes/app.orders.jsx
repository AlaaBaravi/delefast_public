import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, DataTable } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shipments = await db.shipment.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
  });

  return json({ shipments });
};

export default function OrdersPage() {
  const { shipments } = useLoaderData();

  const rows = shipments.map((s) => [
    s.shopifyOrderNumber,
    s.shipmentId,
    s.status,
    new Date(s.sentAt).toLocaleString(),
  ]);

  return (
    <Page title="Orders">
      <Card>
        <DataTable
          columnContentTypes={["text", "text", "text", "text"]}
          headings={["Order", "Shipment ID", "Status", "Sent At"]}
          rows={rows}
        />
      </Card>
    </Page>
  );
}
