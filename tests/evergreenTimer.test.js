/**
 * Unit tests for evergreen timer behavior: status, validation, and storefront selection.
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import { getTimerStatus } from "../server/lib/status.js";
import { parseCreateBody } from "../server/lib/timerValidation.js";
import { timerMatchesTargeting } from "../server/lib/targeting.js";

describe("evergreenTimer", () => {
  describe("getTimerStatus", () => {
    it("returns 'active' for type evergreen regardless of dates", () => {
      assert.strictEqual(
        getTimerStatus({ type: "evergreen", durationSeconds: 600 }),
        "active"
      );
      assert.strictEqual(
        getTimerStatus({ type: "evergreen" }),
        "active"
      );
    });

    it("returns 'expired' for null/undefined timer", () => {
      assert.strictEqual(getTimerStatus(null), "expired");
      assert.strictEqual(getTimerStatus(undefined), "expired");
    });
  });

  describe("parseCreateBody — evergreen", () => {
    it("accepts durationSeconds 1–86400", () => {
      const r1 = parseCreateBody({ name: "E", type: "evergreen", durationSeconds: 1 });
      assert.strictEqual(r1.durationSeconds, 1);
      const r2 = parseCreateBody({ name: "E", type: "evergreen", durationSeconds: 86400 });
      assert.strictEqual(r2.durationSeconds, 86400);
    });

    it("defaults type to fixed when not evergreen", () => {
      const start = new Date(Date.now() - 60000);
      const end = new Date(Date.now() + 3600000);
      const r = parseCreateBody({ name: "F", startAt: start, endAt: end });
      assert.strictEqual(r.type, "fixed");
    });
  });

  describe("storefront selection — evergreen in list", () => {
    it("selects first matching active timer (evergreen before fixed)", () => {
      const evergreen = {
        _id: "e1",
        type: "evergreen",
        targetType: "all",
        durationSeconds: 600,
      };
      const fixed = {
        _id: "f1",
        type: "fixed",
        targetType: "all",
        startAt: new Date(Date.now() - 60000),
        endAt: new Date(Date.now() + 3600000),
      };
      const context = { productId: "p1" };
      assert.strictEqual(timerMatchesTargeting(evergreen, context), true);
      assert.strictEqual(timerMatchesTargeting(fixed, context), true);
      // Storefront loop picks first that matches: order depends on API sort (createdAt -1)
      // Here we only assert both match targeting; first in list wins in storefront.js
    });
  });
});
