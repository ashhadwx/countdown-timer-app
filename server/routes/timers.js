/**
 * Timer API routes (CRUD). All routes expect req.shop from attachShopFromSession.
 * Validation via Zod; sanitization (XSS) applied after parse.
 */
import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import Timer from "../models/Timer.js";
import {
  parseCreateBody,
  parseUpdateBody,
  validationErrorResponse,
} from "../lib/timerValidation.js";
import { sanitizeString } from "../lib/sanitize.js";
import { enforceTimerPlanLimit } from "../middleware/plan.js";

const router = Router();

/** Build DB payload from validated (Zod) result + sanitize all string fields. */
function buildTimerPayload(validated, shop) {
  const p = {
    shop,
    name: sanitizeString(validated.name),
    type: validated.type,
    targetType: validated.targetType,
    productIds: validated.productIds.filter((id) => typeof id === "string"),
    collectionIds: validated.collectionIds.filter((id) => typeof id === "string"),
    promotionDescription: sanitizeString(validated.promotionDescription ?? ""),
    backgroundColor: sanitizeString(validated.backgroundColor ?? "", 50),
    timerSize: validated.timerSize,
    timerPosition: validated.timerPosition,
    urgencyCue: validated.urgencyCue,
    urgencyThresholdSeconds: validated.urgencyThresholdSeconds ?? 300,
  };
  if (validated.type === "fixed") {
    p.startAt = validated.startAt;
    p.endAt = validated.endAt;
  } else {
    p.durationSeconds = validated.durationSeconds;
  }
  return p;
}

// List timers for the current shop (multi-tenant: filter by shop only)
router.get("/", async (req, res) => {
  try {
    const timers = await Timer.find({ shop: req.shop })
      .sort({ createdAt: -1 })
      .lean();
    res.json(timers);
  } catch (err) {
    console.error("Timers list error:", err);
    res.status(500).json({ error: "Failed to list timers" });
  }
});

// Get one timer (ensure it belongs to shop)
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid timer ID" });
    }
    const timer = await Timer.findOne({ _id: req.params.id, shop: req.shop }).lean();
    if (!timer) return res.status(404).json({ error: "Timer not found" });
    res.json(timer);
  } catch (err) {
    console.error("Timer get error:", err);
    res.status(500).json({ error: "Failed to get timer" });
  }
});

// Create timer (enforces plan limits for Free vs Pro)
router.post("/", enforceTimerPlanLimit, async (req, res) => {
  try {
    const validated = parseCreateBody(req.body || {});
    const payload = buildTimerPayload(validated, req.shop);
    const timer = new Timer(payload);
    await timer.save();
    res.status(201).json(timer.toObject());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return validationErrorResponse(res, err);
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    console.error("Timer create error:", err);
    res.status(500).json({ error: "Failed to create timer" });
  }
});

// Update timer
router.patch("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid timer ID" });
    }
    const existing = await Timer.findOne({ _id: req.params.id, shop: req.shop });
    if (!existing) return res.status(404).json({ error: "Timer not found" });
    const validated = parseUpdateBody(req.body || {}, existing);
    const payload = buildTimerPayload(validated, req.shop);
    Object.assign(existing, payload);
    await existing.save();
    res.json(existing.toObject());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return validationErrorResponse(res, err);
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    console.error("Timer update error:", err);
    res.status(500).json({ error: "Failed to update timer" });
  }
});

// Delete timer
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid timer ID" });
    }
    const result = await Timer.findOneAndDelete({ _id: req.params.id, shop: req.shop });
    if (!result) return res.status(404).json({ error: "Timer not found" });
    res.status(204).send();
  } catch (err) {
    console.error("Timer delete error:", err);
    res.status(500).json({ error: "Failed to delete timer" });
  }
});

export default router;
