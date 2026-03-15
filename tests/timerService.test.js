/**
 * Unit tests for timer "service" logic: getTimerStatus and active-timer selection.
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import { getTimerStatus } from "../server/lib/status.js";
import { timerMatchesTargeting } from "../server/lib/targeting.js";

/** Replicate storefront selection: first active timer that matches targeting. */
function selectActiveTimer(timers, context) {
  for (const t of timers) {
    const status = getTimerStatus(t);
    if (status !== "active") continue;
    if (timerMatchesTargeting(t, context)) return t;
  }
  return null;
}

describe("timerService", () => {
  describe("getTimerStatus — fixed", () => {
    it("returns 'active' when now is between startAt and endAt", () => {
      const timer = {
        type: "fixed",
        startAt: new Date(Date.now() - 60000),
        endAt: new Date(Date.now() + 3600000),
      };
      assert.strictEqual(getTimerStatus(timer), "active");
    });

    it("returns 'scheduled' when startAt is in the future", () => {
      const timer = {
        type: "fixed",
        startAt: new Date(Date.now() + 3600000),
        endAt: new Date(Date.now() + 7200000),
      };
      assert.strictEqual(getTimerStatus(timer), "scheduled");
    });

    it("returns 'expired' when endAt is in the past", () => {
      const timer = {
        type: "fixed",
        startAt: new Date(Date.now() - 7200000),
        endAt: new Date(Date.now() - 3600000),
      };
      assert.strictEqual(getTimerStatus(timer), "expired");
    });
  });

  describe("selectActiveTimer", () => {
    it("returns first active timer that matches targeting", () => {
      const activeAll = {
        _id: "1",
        type: "fixed",
        targetType: "all",
        startAt: new Date(Date.now() - 1000),
        endAt: new Date(Date.now() + 10000),
      };
      const activeProduct = {
        _id: "2",
        type: "fixed",
        targetType: "products",
        productIds: ["p99"],
        startAt: new Date(Date.now() - 1000),
        endAt: new Date(Date.now() + 10000),
      };
      const timers = [activeAll, activeProduct];
      const chosen = selectActiveTimer(timers, { productId: "other" });
      assert.ok(chosen);
      assert.strictEqual(chosen._id, "1");
    });

    it("returns null when no timer matches", () => {
      const timer = {
        _id: "1",
        type: "fixed",
        targetType: "products",
        productIds: ["p1"],
        startAt: new Date(Date.now() - 1000),
        endAt: new Date(Date.now() + 10000),
      };
      const chosen = selectActiveTimer([timer], { productId: "p2" });
      assert.strictEqual(chosen, null);
    });

    it("skips expired timers", () => {
      const expired = {
        _id: "1",
        type: "fixed",
        targetType: "all",
        startAt: new Date(Date.now() - 2000),
        endAt: new Date(Date.now() - 1000),
      };
      const chosen = selectActiveTimer([expired], {});
      assert.strictEqual(chosen, null);
    });
  });
});
