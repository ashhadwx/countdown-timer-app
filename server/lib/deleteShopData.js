/**
 * Central helper to delete all data for a given shop across Mongo collections.
 *
 * This is used by:
 * - app/uninstalled webhook (immediate data cleanup)
 * - SHOP_REDACT privacy webhook (48h after uninstall)
 * - Any future manual data-deletion endpoints.
 */
import mongoose from "./db.js";
import Timer from "../models/Timer.js";

/**
 * Delete all documents associated with the given shop.
 * @param {string} shopDomain e.g. "example-shop.myshopify.com"
 */
export async function deleteAllDataForShop(shopDomain) {
  if (!shopDomain) {
    throw new Error("deleteAllDataForShop called without shopDomain");
  }

  const normalizedShop = String(shopDomain).toLowerCase();

  const ops = [];

  // Timers (and embedded analytics) are stored in the Timer collection.
  ops.push(Timer.deleteMany({ shop: normalizedShop }));

  // If you later add more per-shop collections, push their deleteMany calls here:
  // ops.push(OtherModel.deleteMany({ shop: normalizedShop }));

  const results = await Promise.allSettled(ops);

  const errors = results
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => r.status === "rejected");

  if (errors.length > 0) {
    const firstError = /** @type {PromiseRejectedResult} */ (errors[0].r).reason;
    console.error("deleteAllDataForShop encountered errors", {
      shop: normalizedShop,
      error: firstError?.message || firstError,
    });
    throw firstError;
  }

  return true;
}

export default deleteAllDataForShop;

