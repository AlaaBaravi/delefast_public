/**
 * Order Handler Service
 * Handles order events and Delifast integration
 */

import prisma from "../db.server";
import { logger } from "./logger.server";
import { delifastClient } from "./delifastClient.server";
import { prepareOrderDataForDelifast, shouldAutoSend } from "./orderMapper.server";
import {
  getShopifyTag,
  generateTemporaryId,
  isTemporaryId
} from "../utils/statusMapping";

/**
 * Ensure a shipment row exists so the order appears in UI
 * even if auto-send is disabled.
 */
async function ensureShipmentRow(shop, order, initialStatus = "pending") {
  const orderId = String(order.id);
  const orderNumber = order.order_number || order.name || orderId;

  return prisma.shipment.upsert({
    where: {
      shop_shopifyOrderId: {
        shop,
        shopifyOrderId: orderId,
      },
    },
    update: {
      // keep existing shipmentId if present; do not override real data
      shopifyOrderNumber: orderNumber,
      // only set "pending" if the current status is empty/new-ish
      status: initialStatus,
      statusDetails: initialStatus === "pending"
        ? "Waiting for auto-send or manual send"
        : null,
    },
    create: {
      shop,
      shopifyOrderId: orderId,
      shopifyOrderNumber: orderNumber,
      status: initialStatus,
      statusDetails: initialStatus === "pending"
        ? "Waiting for auto-send or manual send"
        : null,
    },
  });
}

/**
 * Handle order created webhook
 */
export async function handleOrderCreated(shop, order, admin) {
  logger.info("Processing order created", {
    orderId: order.id,
    orderNumber: order.name,
  }, shop);

  // ✅ make sure it appears in UI even if auto-send is off
  await ensureShipmentRow(shop, order, "pending");

  // Auto-send on create (if enabled)
  if (await shouldAutoSend(shop, order, "created")) {
    await sendOrderToDelifast(shop, order, admin);
  }
}

/**
 * Handle order paid webhook
 */
export async function handleOrderPaid(shop, order, admin) {
  logger.info("Processing order paid", {
    orderId: order.id,
    orderNumber: order.name,
  }, shop);

  // ✅ ensure it appears (and mark as ready) even if auto-send is off
  await ensureShipmentRow(shop, order, "ready");

  // Check if already sent
  const existing = await prisma.shipment.findUnique({
    where: {
      shop_shopifyOrderId: {
        shop,
        shopifyOrderId: String(order.id),
      },
    },
  });

  if (existing?.shipmentId && !existing.isTemporaryId) {
    logger.debug("Order already sent to Delifast", {
      orderId: order.id,
      shipmentId: existing.shipmentId,
    }, shop);
    return;
  }

  // Auto-send on paid (if enabled)
  if (await shouldAutoSend(shop, order, "paid")) {
    await sendOrderToDelifast(shop, order, admin);
  }
}

/**
 * Handle order updated webhook
 */
export async function handleOrderUpdated(shop, order) {
  logger.debug("Order updated", { orderId: order.id }, shop);
}

/**
 * Send order to Delifast
 */
export async function sendOrderToDelifast(shop, order, admin = null) {
  const orderId = String(order.id);
  const orderNumber = order.order_number || order.name || orderId;

  logger.info("Sending order to Delifast", { orderId, orderNumber }, shop);

  try {
    // Prepare order data
    const orderData = await prepareOrderDataForDelifast(shop, order);

    // Create shipment
    const result = await delifastClient.createShipment(shop, orderData);

    // Determine shipment ID (real or temporary)
    let shipmentId = result.shipmentId;
    let isTemporary = false;

    if (!shipmentId || result.needsLookup) {
      shipmentId = generateTemporaryId(orderNumber);
      isTemporary = true;
    }

    // Save shipment record
    await prisma.shipment.upsert({
      where: {
        shop_shopifyOrderId: {
          shop,
          shopifyOrderId: orderId,
        },
      },
      update: {
        shipmentId,
        isTemporaryId: isTemporary,
        status: "new",
        statusDetails: isTemporary ? "Awaiting real shipment ID" : "Shipment created",
        sentAt: new Date(),
        nextLookupAt: isTemporary ? new Date(Date.now() + 15 * 60 * 1000) : null,
      },
      create: {
        shop,
        shopifyOrderId: orderId,
        shopifyOrderNumber: orderNumber,
        shipmentId,
        isTemporaryId: isTemporary,
        status: "new",
        statusDetails: isTemporary ? "Awaiting real shipment ID" : "Shipment created",
        nextLookupAt: isTemporary ? new Date(Date.now() + 15 * 60 * 1000) : null,
      },
    });

    // Update Shopify order with metafields and tags
    if (admin) {
      try {
        await admin.graphql(
          `#graphql
          mutation updateOrderMetafields($input: OrderInput!) {
            orderUpdate(input: $input) {
              order { id }
              userErrors { field message }
            }
          }`,
          {
            variables: {
              input: {
                id: `gid://shopify/Order/${orderId}`,
                metafields: [
                  { namespace: "delifast", key: "shipment_id", value: shipmentId, type: "single_line_text_field" },
                  { namespace: "delifast", key: "status", value: "new", type: "single_line_text_field" },
                  { namespace: "delifast", key: "is_temporary", value: String(isTemporary), type: "single_line_text_field" },
                ],
              },
            },
          }
        );

        await admin.graphql(
          `#graphql
          mutation addOrderTags($id: ID!, $tags: [String!]!) {
            tagsAdd(id: $id, tags: $tags) {
              node { ... on Order { id tags } }
              userErrors { field message }
            }
          }`,
          {
            variables: {
              id: `gid://shopify/Order/${orderId}`,
              tags: [getShopifyTag("new"), "delifast-sent"],
            },
          }
        );

        logger.debug("Updated Shopify order", { orderId }, shop);
      } catch (shopifyError) {
        logger.warning("Failed to update Shopify order", {
          error: shopifyError.message,
          orderId,
        }, shop);
      }
    }

    logger.info("Order sent to Delifast successfully", {
      orderId,
      shipmentId,
      isTemporary,
    }, shop);

    return { success: true, shipmentId, isTemporary };
  } catch (error) {
    logger.error("Failed to send order to Delifast", {
      orderId,
      error: error.message,
    }, shop);

    await prisma.shipment.upsert({
      where: {
        shop_shopifyOrderId: {
          shop,
          shopifyOrderId: orderId,
        },
      },
      update: {
        status: "error",
        statusDetails: error.message,
      },
      create: {
        shop,
        shopifyOrderId: orderId,
        shopifyOrderNumber: orderNumber,
        status: "error",
        statusDetails: error.message,
      },
    });

    throw error;
  }
}

/**
 * Refresh order status from Delifast
 */
export async function refreshOrderStatus(shop, shopifyOrderId, admin = null) {
  const shipment = await prisma.shipment.findUnique({
    where: {
      shop_shopifyOrderId: {
        shop,
        shopifyOrderId,
      },
    },
  });

  if (!shipment) throw new Error("Shipment not found");

  if (shipment.isTemporaryId || isTemporaryId(shipment.shipmentId)) {
    logger.debug("Cannot refresh status for temporary ID", {
      orderId: shopifyOrderId,
      shipmentId: shipment.shipmentId,
    }, shop);

    return {
      status: "new",
      statusDetails: "This is a temporary ID. Please update with real shipment ID.",
      isTemporary: true,
    };
  }

  const statusResult = await delifastClient.getShipmentStatus(shop, shipment.shipmentId);

  await prisma.shipment.update({
    where: {
      shop_shopifyOrderId: {
        shop,
        shopifyOrderId,
      },
    },
    data: {
      status: statusResult.status,
      statusDetails: statusResult.statusDetails,
    },
  });

  if (admin) {
    try {
      await admin.graphql(
        `#graphql
        mutation updateOrderMetafields($input: OrderInput!) {
          orderUpdate(input: $input) {
            order { id }
            userErrors { field message }
          }
        }`,
        {
          variables: {
            input: {
              id: `gid://shopify/Order/${shopifyOrderId}`,
              metafields: [
                { namespace: "delifast", key: "status", value: statusResult.status, type: "single_line_text_field" },
                { namespace: "delifast", key: "status_details", value: statusResult.statusDetails || "", type: "single_line_text_field" },
              ],
            },
          },
        }
      );

      await admin.graphql(
        `#graphql
        mutation addOrderTags($id: ID!, $tags: [String!]!) {
          tagsAdd(id: $id, tags: $tags) {
            node { ... on Order { id } }
            userErrors { field message }
          }
        }`,
        {
          variables: {
            id: `gid://shopify/Order/${shopifyOrderId}`,
            tags: [getShopifyTag(statusResult.status)],
          },
        }
      );
    } catch (shopifyError) {
      logger.warning("Failed to update Shopify order status", {
        error: shopifyError.message,
      }, shop);
    }
  }

  logger.info("Status refreshed", {
    orderId: shopifyOrderId,
    status: statusResult.status,
  }, shop);

  return statusResult;
}

/**
 * Update shipment ID (replace temporary with real)
 */
export async function updateShipmentId(shop, shopifyOrderId, newShipmentId, admin = null) {
  const shipment = await prisma.shipment.findUnique({
    where: {
      shop_shopifyOrderId: {
        shop,
        shopifyOrderId,
      },
    },
  });

  if (!shipment) throw new Error("Shipment not found");

  const oldShipmentId = shipment.shipmentId;

  await prisma.shipment.update({
    where: {
      shop_shopifyOrderId: {
        shop,
        shopifyOrderId,
      },
    },
    data: {
      shipmentId: newShipmentId,
      isTemporaryId: false,
      status: "new",
      statusDetails: null,
      lookupAttempts: 0,
      nextLookupAt: null,
    },
  });

  logger.info("Shipment ID updated", {
    orderId: shopifyOrderId,
    oldId: oldShipmentId,
    newId: newShipmentId,
  }, shop);

  if (admin) {
    try {
      await admin.graphql(
        `#graphql
        mutation updateOrderMetafields($input: OrderInput!) {
          orderUpdate(input: $input) {
            order { id }
            userErrors { field message }
          }
        }`,
        {
          variables: {
            input: {
              id: `gid://shopify/Order/${shopifyOrderId}`,
              metafields: [
                { namespace: "delifast", key: "shipment_id", value: newShipmentId, type: "single_line_text_field" },
                { namespace: "delifast", key: "is_temporary", value: "false", type: "single_line_text_field" },
              ],
            },
          },
        }
      );
    } catch (shopifyError) {
      logger.warning("Failed to update Shopify metafields", {
        error: shopifyError.message,
      }, shop);
    }
  }

  return refreshOrderStatus(shop, shopifyOrderId, admin);
}

export async function getShipment(shop, shopifyOrderId) {
  return prisma.shipment.findUnique({
    where: {
      shop_shopifyOrderId: {
        shop,
        shopifyOrderId,
      },
    },
  });
}

export async function getShipments(shop, options = {}) {
  const { status, limit = 50, offset = 0 } = options;

  const where = { shop };
  if (status) where.status = status;

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.shipment.count({ where }),
  ]);

  return { shipments, total };
}
