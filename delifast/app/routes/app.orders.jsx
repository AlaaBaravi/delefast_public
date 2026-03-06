import { useEffect, useState } from "react";
import { Page, Card, DataTable } from "@shopify/polaris";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    async function loadOrders() {
      const res = await fetch("/app/orders.data");
      const data = await res.json();
      setOrders(data.shipments || []);
    }

    loadOrders();
  }, []);

  const rows = orders.map((o) => [
    o.shopifyOrderNumber,
    o.shipmentId,
    o.status,
    new Date(o.sentAt).toLocaleString(),
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
