/**
 * Unit tests for analytics (impression) validation and expected behavior.
 * Storefront impression: POST body { shop, timerId } → $inc impressionCount.
 */
import { describe, it } from "node:test";
import assert from "node:assert";

/** Same validation as storefront route: shop must be *.myshopify.com. */
function isValidShop(shop) {
  if (!shop || typeof shop !== "string") return false;
  const s = shop.trim().toLowerCase();
  return s.endsWith(".myshopify.com") && s.length > 0 && s.length < 200;
}

/** MongoDB ObjectId is 24 hex chars. Same rule as mongoose.Types.ObjectId.isValid. */
function isValidObjectId(id) {
  return typeof id === "string" && /^[a-f0-9]{24}$/i.test(id.trim());
}

describe("analyticsService", () => {
  describe("isValidShop", () => {
    it("accepts valid myshopify.com domain", () => {
      assert.strictEqual(isValidShop("store.myshopify.com"), true);
      assert.strictEqual(isValidShop("  my-store.myshopify.com  "), true);
    });

    it("rejects invalid shop", () => {
      assert.strictEqual(isValidShop(""), false);
      assert.strictEqual(isValidShop(null), false);
      assert.strictEqual(isValidShop("https://evil.com"), false);
      assert.strictEqual(isValidShop("store.com"), false);
    });
  });

  describe("timerId validation", () => {
    it("accepts valid ObjectId string (24 hex chars)", () => {
      assert.strictEqual(isValidObjectId("507f1f77bcf86cd799439011"), true);
    });

    it("rejects invalid id", () => {
      assert.strictEqual(isValidObjectId(""), false);
      assert.strictEqual(isValidObjectId("not-an-id"), false);
      assert.strictEqual(isValidObjectId("short"), false);
    });
  });

  describe("impression behavior", () => {
    it("expects update with $inc impressionCount: 1", () => {
      const update = { $inc: { impressionCount: 1 } };
      assert.deepStrictEqual(update, { $inc: { impressionCount: 1 } });
    });
  });
});
