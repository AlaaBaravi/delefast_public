/**
 * Order Mapper Service
 * Prepares Shopify order data for Delifast API
 */

import prisma from "../db.server";
import { logger } from "./logger.server";
import { mapProvinceToCity } from "../utils/cityMapping";

/**
 * Prepare order data for Delifast API
 */
export async function prepareOrderDataForDelifast(shop, order) {
  const settings = await prisma.storeSettings.findUnique({
    where: { shop },
  });

  if (!settings) {
    throw new Error("Store settings not found");
  }

  // Extract billing/shipping address
  const address = order.billing_address || order.shipping_address || {};

  const firstName = address.first_name || "";
  const lastName = address.last_name || "";
  const company = address.company || "";
  const country = address.country_code || address.country || "AE";
  const address1 = address.address1 || "";
  const address2 = address.address2 || "";
  const province = address.province_code || address.province || "";
  const phone = address.phone || order.phone || "";
  const email = order.email || address.email || "";

  // Map province to city ID
  const cityId = mapProvinceToCity(province, settings.defaultCityId);

  logger.debug(
    "Mapped province to city",
    {
      province,
      cityId,
      defaultCityId: settings.defaultCityId,
    },
    shop
  );

  // Process line items (products)
  const products = (order.line_items || []).map((item) => {
    const variantTitle = item.variant_title || "";
    const variantParts = variantTitle.split(" / ");

    let color = "";
    let size = "";

    for (const part of variantParts) {
      const partLower = part.toLowerCase();
      if (partLower.includes("color") || partLower.includes("لون")) {
        color = part
          .replace(/color[:\s]*/i, "")
          .replace(/لون[:\s]*/i, "")
          .trim();
      } else if (partLower.includes("size") || partLower.includes("مقاس")) {
        size = part
          .replace(/size[:\s]*/i, "")
          .replace(/مقاس[:\s]*/i, "")
          .trim();
      }
    }

    if (!color && !size && variantParts.length > 0) {
      if (variantParts.length === 1) {
        size = variantParts[0];
      } else {
        color = variantParts[0];
        size = variantParts[1];
      }
    }

    return {
      ProductName: item.name || item.title || "Product",
      Color: color,
      Size: size,
      Quantity: String(item.quantity || 1),
    };
  });

  // ✅ Correct gateway detection
  const gateways =
    Array.isArray(order.payment_gateway_names) ? order.payment_gateway_names : [];
  const paymentGateway =
    gateways[0] ||
    order.gateway || // fallback if present
    "";

  const gatewayLower = String(paymentGateway).toLowerCase();

  // ✅ Better COD detection
  const isCOD =
    gatewayLower === "cod" ||
    gatewayLower.includes("cash") ||
    gatewayLower.includes("delivery") ||
    gatewayLower.includes("payment_on_delivery");

  const financialStatus = String(order.financial_status || "").toLowerCase();
  const isPaid = financialStatus === "paid" || financialStatus === "partially_paid";

  let totalPrice = parseFloat(order.total_price || 0);
  let codAmount = 0;
  let paymentMethodId = 1; // 1 prepaid, 0 COD (your API logic)
  let shippingFeesOnSender = settings.feesOnSender;
  let shippingFeesPaid = settings.feesPaid;

  if (isCOD) {
    codAmount = totalPrice;
    paymentMethodId = 0;
    shippingFeesOnSender = false;
    shippingFeesPaid = false;
  } else if (isPaid) {
    // prepaid → collect nothing
    codAmount = 0;
    paymentMethodId = 1;
  } else {
    // not paid + not COD gateway → treat as COD (your original behavior)
    codAmount = totalPrice;
    paymentMethodId = 0;
    shippingFeesOnSender = false;
    shippingFeesPaid = false;
  }

  logger.debug(
    "Payment calculation",
    {
      financialStatus,
      gateways,
      paymentGateway,
      isCOD,
      isPaid,
      totalPrice,
      codAmount,
      paymentMethodId,
    },
    shop
  );

  const orderData = {
    billing_first_name: firstName,
    billing_last_name: lastName,
    billing_company: company,
    billing_country: country,
    billing_address_1: address1,
    billing_address_2: address2,
    billing_city: cityId,
    billing_state: province,
    billing_phone: phone,
    billing_email: email,

    billing_ref: String(order.order_number || order.name || order.id),

    totalPrice,
    codAmount,
    paymentMethodId,

    shippingFeesOnSender,
    shippingFeesPaid,

    Products: products,
  };

  logger.info(
    "Prepared order data for Delifast",
    {
      orderRef: orderData.billing_ref,
      cityId: orderData.billing_city,
      productsCount: products.length,
      totalPrice: orderData.totalPrice,
      codAmount: orderData.codAmount,
    },
    shop
  );

  return orderData;
}

export function extractOrderInfo(order) {
  const address = order.billing_address || order.shipping_address || {};

  return {
    id: order.id,
    orderNumber: order.order_number || order.name,
    email: order.email,
    customerName: `${address.first_name || ""} ${address.last_name || ""}`.trim(),
    phone: address.phone || order.phone,
    totalPrice: order.total_price,
    financialStatus: order.financial_status,
    fulfillmentStatus: order.fulfillment_status,
    gateway: (order.payment_gateway_names || [order.gateway]).filter(Boolean)[0] || "",
    createdAt: order.created_at,
  };
}

/**
 * Check if order should be auto-sent based on settings
 */
export async function shouldAutoSend(shop, order, trigger) {
  const settings = await prisma.storeSettings.findUnique({
    where: { shop },
    select: {
      mode: true,
      autoSendStatus: true,
    },
  });

  if (!settings || settings.mode !== "auto") {
    return false;
  }

  const triggerStatusMap = {
    created: "created",
    paid: "paid",
    fulfilled: "fulfilled",
  };

  return settings.autoSendStatus === triggerStatusMap[trigger];
}
