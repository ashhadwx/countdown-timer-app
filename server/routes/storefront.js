/**
 * Storefront API: single timer fetch and impression recording.
 * No session; validate shop from query/body. Return one active timer config or 204.
 * CORS allows Shopify store and theme-preview origins.
 */
import { Router } from "express";
import mongoose from "mongoose";
import Timer from "../models/Timer.js";
import { timerMatchesTargeting } from "../lib/targeting.js";

const router = Router();
const CACHE_MAX_AGE = 60; // seconds (documented in README and docs/API.md)

/** Allowed CORS origins: *.myshopify.com and *.shopifypreview.com (https only). */
function isAllowedStorefrontOrigin(origin) {
  if (!origin || typeof origin !== "string") return false;
  const o = origin.trim().toLowerCase();
  if (!o.startsWith("https://")) return false;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host.endsWith(".myshopify.com") || host.endsWith(".shopifypreview.com");
  } catch {
    return false;
  }
}

/** Set CORS headers for storefront API when request is from an allowed origin (e.g. theme preview). */
function storefrontCors(req, res, next) {
  const origin = req.get("Origin");
  if (origin && isAllowedStorefrontOrigin(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.set("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
}

router.use(storefrontCors);

function isValidShop(shop) {
  if (!shop || typeof shop !== "string") return false;
  const s = shop.trim().toLowerCase();
  return s.endsWith(".myshopify.com") && s.length > 0 && s.length < 200;
}

/** POST /api/storefront/impression — record one view. Body: { shop, timerId }. */
router.post("/impression", async (req, res) => {
  const shop = (req.body?.shop || "").trim();
  if (!isValidShop(shop)) {
    return res.status(401).json({ error: "Missing or invalid shop" });
  }
  const timerId = (req.body?.timerId || "").trim();
  if (!timerId || !mongoose.Types.ObjectId.isValid(timerId)) {
    return res.status(400).json({ error: "Missing or invalid timerId" });
  }
  try {
    const result = await Timer.findOneAndUpdate(
      { _id: timerId, shop },
      { $inc: { impressionCount: 1 } },
      { new: true }
    );
    if (!result) return res.status(404).json({ error: "Timer not found" });
    res.status(204).send();
  } catch (err) {
    console.error("Storefront impression error:", err);
    res.status(500).json({ error: "Failed to record impression" });
  }
});

/**
 * GET /api/storefront/timer?shop=store.myshopify.com&productId=gid://shopify/Product/123&collectionIds=gid1,gid2
 * Returns one active timer for the shop that matches targeting, or 204.
 */
router.get("/timer", async (req, res) => {
  const shop = (req.query.shop || "").trim();
  if (!isValidShop(shop)) {
    return res.status(401).json({ error: "Missing or invalid shop parameter" });
  }

  const productId = (req.query.productId || "").trim();
  const collectionIdsParam = req.query.collectionIds;
  const collectionIds = Array.isArray(collectionIdsParam)
    ? collectionIdsParam.map(String).filter(Boolean)
    : typeof collectionIdsParam === "string"
      ? collectionIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  try {
    const now = new Date();
    const timers = await Timer.find({
      shop,
      $or: [
        { type: "fixed", startAt: { $lte: now }, endAt: { $gte: now } },
        { type: "evergreen" },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    const context = { productId, collectionIds };
    let chosen = null;
    for (const t of timers) {
      if (timerMatchesTargeting(t, context)) {
        chosen = t;
        break;
      }
    }

    res.set("Cache-Control", `public, max-age=${CACHE_MAX_AGE}`);

    if (!chosen) {
      return res.status(204).send();
    }

    const payload = {
      id: chosen._id.toString(),
      type: chosen.type,
      promotionDescription: chosen.promotionDescription || "",
      backgroundColor: chosen.backgroundColor || "",
      timerSize: chosen.timerSize || "medium",
      timerPosition: chosen.timerPosition || "top",
      urgencyCue: chosen.urgencyCue || "color_pulse",
      urgencyThresholdSeconds: chosen.urgencyThresholdSeconds ?? 300,
    };
    if (chosen.type === "fixed") {
      payload.endAt = chosen.endAt;
      payload.startAt = chosen.startAt;
    } else {
      payload.durationSeconds = chosen.durationSeconds || 600;
    }

    res.json(payload);
  } catch (err) {
    console.error("Storefront timer error:", err);
    res.status(500).json({ error: "Failed to load timer" });
  }
});

export default router;
