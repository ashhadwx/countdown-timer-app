import { BillingInterval, LATEST_API_VERSION } from "@shopify/shopify-api";
import { shopifyApp } from "@shopify/shopify-app-express";
import { SQLiteSessionStorage } from "@shopify/shopify-app-session-storage-sqlite";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-10";

const DB_PATH = `${process.cwd()}/database.sqlite`;

/** Public app URL: `shopify app dev` sets HOST; otherwise use SHOPIFY_APP_URL or a dev fallback. */
function resolvePublicAppUrl() {
  const explicit = (process.env.HOST || process.env.SHOPIFY_APP_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.NODE_ENV !== "production") {
    const port = process.env.PORT || process.env.BACKEND_PORT || "3000";
    return `http://127.0.0.1:${port}`;
  }
  return "";
}

function hostNameFromAppUrl(url) {
  if (!url) return "";
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function hostSchemeFromAppUrl(url) {
  if (!url) return "https";
  return url.startsWith("http://") ? "http" : "https";
}

const publicAppUrl = resolvePublicAppUrl();
if (!publicAppUrl) {
  throw new Error(
    "Set HOST or SHOPIFY_APP_URL in .env to your app's public HTTPS URL (Partners app URL). `shopify app dev` sets HOST automatically."
  );
}

const resolvedHostName = hostNameFromAppUrl(publicAppUrl);
const resolvedHostScheme = hostSchemeFromAppUrl(publicAppUrl);

// Billing configuration for app subscription plans.
// ProPlan is a recurring subscription; adjust price and interval as needed.
const billingConfig = {
  ProPlan: {
    amount: 5.0,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
    trialDays: 7,
  },
};

const shopify = shopifyApp({
  api: {
    hostName: resolvedHostName,
    hostScheme: resolvedHostScheme,
    apiVersion: LATEST_API_VERSION,
    restResources,
    future: {
      customerAddressDefaultFix: true,
      lineItemBilling: true,
      unstable_managedPricingSupport: true,
    },
    billing: billingConfig,
  },
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  // This should be replaced with your preferred storage strategy
  sessionStorage: new SQLiteSessionStorage(DB_PATH),
});

export default shopify;
