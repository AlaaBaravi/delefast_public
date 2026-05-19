/**
 * Settings Page
 * FIX: s-select web component does not expose an .options property
 * in this version of @shopify/shopify-app-react-router.
 * Solution: replace all <s-select> with native <select> elements
 * styled to exactly match Polaris design tokens.
 */

import { useState, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { getAvailableCities } from "../utils/cityMapping";

// ─────────────────────────────────────────────────────────────────────────────
// PolarisSelect — native <select> styled to match Shopify Polaris exactly
// ─────────────────────────────────────────────────────────────────────────────
function PolarisSelect({ label, value, onChange, options, helpText, disabled }) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {label && (
        <label style={{
          fontSize: "14px",
          fontWeight: "500",
          lineHeight: "20px",
          color: "#202223",
        }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select
          value={value ?? ""}
          onChange={onChange}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            minHeight: "36px",
            padding: "5px 32px 5px 12px",
            fontSize: "14px",
            lineHeight: "20px",
            color: disabled ? "#8c9196" : "#202223",
            backgroundColor: disabled ? "#fafbfb" : "#ffffff",
            border: focused ? "2px solid #005bd3" : "1px solid #c9cccf",
            borderRadius: "8px",
            appearance: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            outline: "none",
            boxShadow: focused ? "0 0 0 3px rgba(0,91,211,0.2)" : "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Polaris chevron icon */}
        <span style={{
          position: "absolute",
          right: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: "#8c9196",
          display: "flex",
        }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd"
              d="M5.72 7.47a.75.75 0 0 1 1.06 0L10 10.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0L5.72 8.53a.75.75 0 0 1 0-1.06Z"
            />
          </svg>
        </span>
      </div>
      {helpText && (
        <p style={{ fontSize: "12px", lineHeight: "16px", color: "#6d7175", margin: 0 }}>
          {helpText}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Static option lists
// ─────────────────────────────────────────────────────────────────────────────
const MODE_OPTIONS = [
  { label: "Manual — Send orders manually", value: "manual" },
  { label: "Auto — Send orders automatically", value: "auto" },
];

const AUTO_SEND_OPTIONS = [
  { label: "When order is created", value: "created" },
  { label: "When order is paid", value: "paid" },
  { label: "When order is fulfilled", value: "fulfilled" },
];

const PAYMENT_OPTIONS = [
  { label: "COD — Cash on Delivery", value: "0" },
  { label: "Prepaid", value: "1" },
];

// ─────────────────────────────────────────────────────────────────────────────
// SERVER LOADER
// ─────────────────────────────────────────────────────────────────────────────
export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const prisma = (await import("../db.server")).default;

  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let settings = await prisma.storeSettings.findUnique({ where: { shop } });
  if (!settings) {
    settings = await prisma.storeSettings.create({ data: { shop } });
  }

  const hasPassword = !!settings.delifastPassword;
  return {
    settings: {
      ...settings,
      delifastPassword: hasPassword ? "********" : "",
      hasPassword,
    },
    cities: getAvailableCities(),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVER ACTION
// ─────────────────────────────────────────────────────────────────────────────
export const action = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const prisma = (await import("../db.server")).default;
  const { encrypt } = await import("../services/encryption.server");
  const { testConnection } = await import("../services/delifastClient.server");

  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const actionType = formData.get("_action");

  if (actionType === "test_connection") {
    try {
      const result = await testConnection(shop);
      return { success: true, message: "Connection successful!", result };
    } catch (error) {
      return { success: false, message: error?.message || "Connection failed" };
    }
  }

  const tab = formData.get("tab");
  const updates = {};

  if (tab === "general" || !tab) {
    updates.delifastUsername = formData.get("delifastUsername") || null;
    const newPassword = formData.get("delifastPassword");
    if (newPassword && newPassword !== "********") {
      updates.delifastPassword = encrypt(newPassword);
    }
    updates.delifastCustomerId = formData.get("delifastCustomerId") || null;
    updates.mode = formData.get("mode") || "auto";
    updates.autoSendStatus = formData.get("autoSendStatus") || "paid";
  }

  if (tab === "sender") {
    updates.senderNo      = formData.get("senderNo")      || null;
    updates.senderName    = formData.get("senderName")    || null;
    updates.senderAddress = formData.get("senderAddress") || null;
    updates.senderMobile  = formData.get("senderMobile")  || null;
    updates.senderCityId  = formData.get("senderCityId")
      ? parseInt(formData.get("senderCityId"), 10) : null;
    updates.senderAreaId  = formData.get("senderAreaId")
      ? parseInt(formData.get("senderAreaId"), 10) : null;
  }

  if (tab === "shipping") {
    updates.defaultWeight     = formData.get("defaultWeight")
      ? parseFloat(formData.get("defaultWeight")) : 1.0;
    updates.defaultDimensions = formData.get("defaultDimensions") || "10x10x10";
    updates.defaultCityId     = formData.get("defaultCityId")
      ? parseInt(formData.get("defaultCityId"), 10) : 5;
    updates.paymentMethodId   = formData.get("paymentMethodId")
      ? parseInt(formData.get("paymentMethodId"), 10) : 0;
    updates.feesOnSender      = formData.get("feesOnSender") === "true";
    updates.feesPaid          = formData.get("feesPaid")     === "true";
  }

  await prisma.storeSettings.update({ where: { shop }, data: updates });
  return { success: true, message: "Settings saved successfully!" };
};

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Settings() {
  const { settings, cities } = useLoaderData();
  const fetcher  = useFetcher();
  const shopify  = useAppBridge();

  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData]   = useState(settings);

  const isLoading  = fetcher.state !== "idle";
  const actionData = fetcher.data;

  const cityOptions = [
    { label: "Select a city", value: "" },
    ...cities.map((c) => ({ label: c.name, value: String(c.id) })),
  ];
  const cityOptionsRequired = cities.map((c) => ({
    label: c.name,
    value: String(c.id),
  }));

  useEffect(() => {
    if (actionData?.success) {
      shopify.toast.show(actionData.message);
    } else if (actionData?.success === false) {
      shopify.toast.show(actionData.message, { isError: true });
    }
  }, [actionData, shopify]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (tab) => {
    const form = new FormData();
    form.set("tab", tab);
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        form.set(key, String(value));
      }
    });
    fetcher.submit(form, { method: "POST" });
  };

  const handleTestConnection = () => {
    const form = new FormData();
    form.set("_action", "test_connection");
    fetcher.submit(form, { method: "POST" });
  };

  return (
    <s-page heading="Delifast Settings">

      <s-tabs selected={activeTab} onSelect={(index) => setActiveTab(index)}>
        {["General", "Sender", "Shipping"].map((tab, index) => (
          <s-tab key={index}>{tab}</s-tab>
        ))}
      </s-tabs>

      {/* ── GENERAL ─────────────────────────────────────────────────────── */}
      {activeTab === 0 && (
        <s-section heading="General Settings">
          <s-stack direction="block" gap="base">

            <s-text-field
              label="Delifast Username"
              value={formData.delifastUsername || ""}
              onChange={(e) => handleInputChange("delifastUsername", e.target.value)}
              helpText="Your Delifast portal login username"
            />

            <s-text-field
              label="Delifast Password"
              type="password"
              value={formData.delifastPassword || ""}
              onChange={(e) => handleInputChange("delifastPassword", e.target.value)}
              helpText="Your Delifast portal password"
            />

            <s-text-field
              label="Customer ID"
              value={formData.delifastCustomerId || ""}
              onChange={(e) => handleInputChange("delifastCustomerId", e.target.value)}
              helpText="Auto-filled after successful login (optional)"
            />

            <s-divider />

            {/* ✅ FIXED: native <select> — works 100% */}
            <PolarisSelect
              label="Mode"
              value={formData.mode || "auto"}
              options={MODE_OPTIONS}
              onChange={(e) => handleInputChange("mode", e.target.value)}
            />

            <PolarisSelect
              label="Auto-send Trigger"
              value={formData.autoSendStatus || "paid"}
              options={AUTO_SEND_OPTIONS}
              disabled={formData.mode === "manual"}
              helpText={
                formData.mode === "manual"
                  ? "Switch Mode to Auto to enable"
                  : "When should orders be sent to Delifast?"
              }
              onChange={(e) => handleInputChange("autoSendStatus", e.target.value)}
            />

            <s-stack direction="inline" gap="base">
              <s-button onClick={() => handleSubmit("general")} loading={isLoading}>
                Save General Settings
              </s-button>
              <s-button
                variant="secondary"
                onClick={handleTestConnection}
                loading={isLoading}
                disabled={!formData.delifastUsername || !formData.delifastPassword}
              >
                Test Connection
              </s-button>
            </s-stack>

          </s-stack>
        </s-section>
      )}

      {/* ── SENDER ──────────────────────────────────────────────────────── */}
      {activeTab === 1 && (
        <s-section heading="Sender Settings">
          <s-paragraph>
            Sender information is automatically populated from your Delifast
            account after login. You can also manually configure it here.
          </s-paragraph>
          <s-stack direction="block" gap="base">

            <s-text-field
              label="Sender Number"
              value={formData.senderNo || ""}
              onChange={(e) => handleInputChange("senderNo", e.target.value)}
              helpText="Your Delifast sender/customer number"
            />
            <s-text-field
              label="Sender Name"
              value={formData.senderName || ""}
              onChange={(e) => handleInputChange("senderName", e.target.value)}
            />
            <s-text-field
              label="Sender Address"
              value={formData.senderAddress || ""}
              onChange={(e) => handleInputChange("senderAddress", e.target.value)}
              multiline
            />
            <s-text-field
              label="Mobile Number"
              value={formData.senderMobile || ""}
              onChange={(e) => handleInputChange("senderMobile", e.target.value)}
            />

            {/* ✅ FIXED */}
            <PolarisSelect
              label="City"
              value={String(formData.senderCityId || "")}
              options={cityOptions}
              onChange={(e) => handleInputChange("senderCityId", e.target.value)}
            />

            <s-text-field
              label="Area ID"
              value={formData.senderAreaId || ""}
              onChange={(e) => handleInputChange("senderAreaId", e.target.value)}
              helpText="Delifast area ID for your location"
            />

            <s-button onClick={() => handleSubmit("sender")} loading={isLoading}>
              Save Sender Settings
            </s-button>

          </s-stack>
        </s-section>
      )}

      {/* ── SHIPPING ────────────────────────────────────────────────────── */}
      {activeTab === 2 && (
        <s-section heading="Shipping Settings">
          <s-stack direction="block" gap="base">

            <s-text-field
              label="Default Weight (kg)"
              type="number"
              step="0.1"
              value={formData.defaultWeight || 1.0}
              onChange={(e) => handleInputChange("defaultWeight", e.target.value)}
            />
            <s-text-field
              label="Default Dimensions"
              value={formData.defaultDimensions || "10x10x10"}
              onChange={(e) => handleInputChange("defaultDimensions", e.target.value)}
              helpText="Format: LxWxH in cm (e.g., 10x10x10)"
            />

            {/* ✅ FIXED */}
            <PolarisSelect
              label="Default Destination City"
              value={String(formData.defaultCityId || "5")}
              options={cityOptionsRequired}
              helpText="Used when customer city cannot be determined"
              onChange={(e) => handleInputChange("defaultCityId", e.target.value)}
            />

            <PolarisSelect
              label="Payment Method"
              value={String(formData.paymentMethodId ?? "0")}
              options={PAYMENT_OPTIONS}
              onChange={(e) => handleInputChange("paymentMethodId", e.target.value)}
            />

            <s-checkbox
              checked={!!formData.feesOnSender}
              onChange={(e) => handleInputChange("feesOnSender", e.target.checked)}
            >
              Shipping fees on sender (for prepaid orders)
            </s-checkbox>
            <s-checkbox
              checked={!!formData.feesPaid}
              onChange={(e) => handleInputChange("feesPaid", e.target.checked)}
            >
              Shipping fees already paid
            </s-checkbox>

            <s-button onClick={() => handleSubmit("shipping")} loading={isLoading}>
              Save Shipping Settings
            </s-button>

          </s-stack>
        </s-section>
      )}

      {/* ── ASIDE: Connection Status ─────────────────────────────────────── */}
      <s-section slot="aside" heading="Connection Status">
        {settings.apiToken ? (
          <s-banner tone="success">
            <s-text>Connected to Delifast</s-text>
            {settings.tokenExpiry && (
              <s-text variant="subdued">
                Token expires: {new Date(settings.tokenExpiry).toLocaleString()}
              </s-text>
            )}
          </s-banner>
        ) : (
          <s-banner tone="warning">
            <s-text>Not connected. Please enter credentials and test connection.</s-text>
          </s-banner>
        )}
      </s-section>

      {/* ── ASIDE: Quick Links ───────────────────────────────────────────── */}
      <s-section slot="aside" heading="Quick Links">
        <s-unordered-list>
          <s-list-item><s-link href="/app">Dashboard</s-link></s-list-item>
          <s-list-item><s-link href="/app/orders">Orders</s-link></s-list-item>
          <s-list-item><s-link href="/app/logs">Activity Logs</s-link></s-list-item>
          <s-list-item>
            <s-link href="https://portal.delifast.ae" target="_blank">
              Delifast Portal
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>

    </s-page>
  );
}

export const headers = async (headersArgs) => {
  const { boundary } = await import("@shopify/shopify-app-react-router/server");
  return boundary.headers(headersArgs);
};
