/**
 * Unit tests for timer targeting: timerMatchesTargeting (all / products / collections).
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import { timerMatchesTargeting } from "../server/lib/targeting.js";

describe("targetingLogic", () => {
  describe("targetType: all", () => {
    it("returns true for any context", () => {
      const timer = { targetType: "all" };
      assert.strictEqual(timerMatchesTargeting(timer, {}), true);
      assert.strictEqual(timerMatchesTargeting(timer, { productId: "p1" }), true);
      assert.strictEqual(timerMatchesTargeting(timer, { collectionIds: ["c1"] }), true);
    });
  });

  describe("targetType: products", () => {
    it("returns true when productId is in productIds", () => {
      const timer = { targetType: "products", productIds: ["gid://shopify/Product/1", "gid://shopify/Product/2"] };
      assert.strictEqual(
        timerMatchesTargeting(timer, { productId: "gid://shopify/Product/1" }),
        true
      );
      assert.strictEqual(
        timerMatchesTargeting(timer, { productId: "gid://shopify/Product/2" }),
        true
      );
    });

    it("returns false when productId is not in productIds", () => {
      const timer = { targetType: "products", productIds: ["gid://shopify/Product/1"] };
      assert.strictEqual(
        timerMatchesTargeting(timer, { productId: "gid://shopify/Product/99" }),
        false
      );
    });

    it("returns false when productId is missing", () => {
      const timer = { targetType: "products", productIds: ["p1"] };
      assert.strictEqual(timerMatchesTargeting(timer, {}), false);
      assert.strictEqual(timerMatchesTargeting(timer, { productId: "" }), false);
    });

    it("returns false when productIds is empty", () => {
      const timer = { targetType: "products", productIds: [] };
      assert.strictEqual(timerMatchesTargeting(timer, { productId: "p1" }), false);
    });
  });

  describe("targetType: collections", () => {
    it("returns true when any collectionId matches", () => {
      const timer = { targetType: "collections", collectionIds: ["c1", "c2"] };
      assert.strictEqual(
        timerMatchesTargeting(timer, { collectionIds: ["c0", "c1"] }),
        true
      );
      assert.strictEqual(
        timerMatchesTargeting(timer, { collectionIds: ["c2"] }),
        true
      );
    });

    it("returns false when no collectionId matches", () => {
      const timer = { targetType: "collections", collectionIds: ["c1", "c2"] };
      assert.strictEqual(
        timerMatchesTargeting(timer, { collectionIds: ["c0", "c3"] }),
        false
      );
    });

    it("returns false when collectionIds is empty", () => {
      const timer = { targetType: "collections", collectionIds: ["c1"] };
      assert.strictEqual(timerMatchesTargeting(timer, { collectionIds: [] }), false);
      assert.strictEqual(timerMatchesTargeting(timer, {}), false);
    });
  });

  describe("edge cases", () => {
    it("returns false for null/undefined timer", () => {
      assert.strictEqual(timerMatchesTargeting(null, { productId: "p1" }), false);
      assert.strictEqual(timerMatchesTargeting(undefined, {}), false);
    });
  });
});
