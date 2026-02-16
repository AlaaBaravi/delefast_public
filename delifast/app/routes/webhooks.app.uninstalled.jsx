import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  try {
    const { shop } = await authenticate.webhook(request);

    // Clean up shop data on uninstall (optional but recommended)
    await prisma.shipment.deleteMany({ where: { shop } });
    await prisma.storeSettings.deleteMany({ where: { shop } });
    // If you store sessions in DB via Prisma:
    // await prisma.session.deleteMany({ where: { shop } });

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("WEBHOOK app/uninstalled failed:", e);
    return new Response("unauthorized", { status: 401 });
  }
};
