import { DeliveryMethod } from "@shopify/shopify-api";
import deleteAllDataForShop from "./lib/deleteShopData.js";

/**
 * @type {{[key: string]: import("@shopify/shopify-api").WebhookHandler}}
 */
export default {
  /**
   * Fired immediately when a merchant uninstalls the app.
   * We use this to proactively delete all shop-specific data.
   *
   * https://shopify.dev/docs/api/admin-graphql/latest/objects/AppUninstalled
   */
  APP_UNINSTALLED: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, _webhookId) => {
      try {
        const payload = JSON.parse(body);
        console.log("APP_UNINSTALLED webhook received", { shop, topic, payload });
        await deleteAllDataForShop(shop);
        console.log("All data deleted for shop after APP_UNINSTALLED", { shop });
      } catch (err) {
        console.error("APP_UNINSTALLED handler error", {
          shop,
          error: err?.message || err,
        });
        // Do not rethrow; webhook retries are not required for data deletion.
      }
    },
  },

  /**
   * Customers can request their data from a store owner. When this happens,
   * Shopify invokes this privacy webhook.
   *
   * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#customers-data_request
   */
  CUSTOMERS_DATA_REQUEST: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, _webhookId) => {
      const _payload = JSON.parse(body);
      // Payload has the following shape:
      // {
      //   "shop_id": 954889,
      //   "shop_domain": "{shop}.myshopify.com",
      //   "orders_requested": [
      //     299938,
      //     280263,
      //     220458
      //   ],
      //   "customer": {
      //     "id": 191167,
      //     "email": "john@example.com",
      //     "phone": "555-625-1199"
      //   },
      //   "data_request": {
      //     "id": 9999
      //   }
      // }
    },
  },

  /**
   * Store owners can request that data is deleted on behalf of a customer. When
   * this happens, Shopify invokes this privacy webhook.
   *
   * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#customers-redact
   */
  CUSTOMERS_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, _webhookId) => {
      const _payload = JSON.parse(body);
      // Payload has the following shape:
      // {
      //   "shop_id": 954889,
      //   "shop_domain": "{shop}.myshopify.com",
      //   "customer": {
      //     "id": 191167,
      //     "email": "john@example.com",
      //     "phone": "555-625-1199"
      //   },
      //   "orders_to_redact": [
      //     299938,
      //     280263,
      //     220458
      //   ]
      // }
    },
  },

  /**
   * 48 hours after a store owner uninstalls your app, Shopify invokes this
   * privacy webhook.
   *
   * https://shopify.dev/docs/apps/webhooks/configuration/mandatory-webhooks#shop-redact
   */
  SHOP_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (topic, shop, body, _webhookId) => {
      const _payload = JSON.parse(body);
      try {
        console.log("SHOP_REDACT webhook received", { shop, topic, payload: _payload });
        await deleteAllDataForShop(shop);
        console.log("All data deleted for shop after SHOP_REDACT", { shop });
      } catch (err) {
        console.error("SHOP_REDACT handler error", {
          shop,
          error: err?.message || err,
        });
      }
      // Payload has the following shape:
      // {
      //   "shop_id": 954889,
      //   "shop_domain": "{shop}.myshopify.com"
      // }
    },
  },
};
