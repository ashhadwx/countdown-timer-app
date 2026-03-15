/**
 * Unit tests for timer request validation (Zod schemas, parseCreateBody, parseUpdateBody).
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import {
  parseCreateBody,
  parseUpdateBody,
  validationErrorResponse,
} from "../server/lib/timerValidation.js";

describe("timerValidation", () => {
  describe("createTimerSchema / parseCreateBody — fixed timer", () => {
    it("accepts valid fixed timer with startAt < endAt", () => {
      const start = new Date(Date.now() - 60000);
      const end = new Date(Date.now() + 3600000);
      const body = {
        name: "Black Friday",
        type: "fixed",
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      };
      const result = parseCreateBody(body);
      assert.strictEqual(result.type, "fixed");
      assert.strictEqual(result.name, "Black Friday");
      assert.ok(new Date(result.endAt) > new Date(result.startAt));
    });

    it("rejects fixed timer when endAt <= startAt", () => {
      const start = new Date(Date.now() + 3600000);
      const end = new Date(Date.now() - 60000);
      assert.throws(
        () => parseCreateBody({ name: "X", type: "fixed", startAt: start, endAt: end }),
        (err) => err.message.includes("End date/time")
      );
    });

    it("rejects missing name", () => {
      const start = new Date(Date.now() - 60000);
      const end = new Date(Date.now() + 3600000);
      assert.throws(
        () => parseCreateBody({ type: "fixed", startAt: start, endAt: end }),
        (err) => err.name === "ZodError"
      );
    });
  });

  describe("createTimerSchema / parseCreateBody — evergreen timer", () => {
    it("accepts valid evergreen with durationSeconds in range", () => {
      const result = parseCreateBody({
        name: "Flash sale",
        type: "evergreen",
        durationSeconds: 600,
      });
      assert.strictEqual(result.type, "evergreen");
      assert.strictEqual(result.durationSeconds, 600);
    });

    it("clamps durationSeconds to valid range", () => {
      const result = parseCreateBody({
        name: "E",
        type: "evergreen",
        durationSeconds: 0,
      });
      assert.ok(result.durationSeconds >= 1 && result.durationSeconds <= 86400);
    });

    it("clamps durationSeconds to max 86400", () => {
      const result = parseCreateBody({
        name: "E",
        type: "evergreen",
        durationSeconds: 100000,
      });
      assert.strictEqual(result.durationSeconds, 86400);
    });
  });

  describe("parseUpdateBody", () => {
    it("merges body with existing and validates", () => {
      const existing = {
        toObject: () => ({
          name: "Original",
          type: "fixed",
          startAt: new Date(Date.now() - 60000),
          endAt: new Date(Date.now() + 3600000),
          targetType: "all",
          productIds: [],
          collectionIds: [],
          promotionDescription: "",
          backgroundColor: "",
          timerSize: "medium",
          timerPosition: "top",
          urgencyCue: "color_pulse",
          urgencyThresholdSeconds: 300,
        }),
      };
      const result = parseUpdateBody({ name: "Updated name" }, existing);
      assert.strictEqual(result.name, "Updated name");
      assert.strictEqual(result.type, "fixed");
    });
  });

  describe("validationErrorResponse", () => {
    it("returns 400 with error message from first Zod error", () => {
      const res = {
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(obj) {
          this.body = obj;
          return this;
        },
      };
      const zodError = {
        errors: [{ path: ["name"], message: "Required" }],
      };
      validationErrorResponse(res, zodError);
      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.error);
    });
  });
});
