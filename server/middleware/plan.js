import ShopPlan from "../models/ShopPlan.js";
import Timer from "../models/Timer.js";
import shopify from "../shopify.js";

/**
 * Load or create the ShopPlan for the current shop and attach it to req.shopPlan.
 * Also checks billing status with Shopify and syncs the stored plan (free/pro).
 */
export async function attachShopPlan(req, res, next) {
  try {
    const shop = (req.shop || "").toLowerCase();
    if (!shop) return next();

    let plan = await ShopPlan.findOne({ shop });
    if (!plan) {
      plan = await ShopPlan.create({ shop, plan: "free" });
    }

    // If we have a Shopify session, verify whether ProPlan is active and sync.
    const session = res?.locals?.shopify?.session;
    if (session) {
      try {
        const result = await shopify.api.billing.check({
          session,
          plans: ["ProPlan"],
          isTest: process.env.NODE_ENV !== "production",
          returnObject: true,
        });
        if (result?.hasActivePayment && plan.plan !== "pro") {
          plan.plan = "pro";
          await plan.save();
        }
      } catch (err) {
        console.error("attachShopPlan billing.check error", err);
      }
    }

    req.shopPlan = plan;
    next();
  } catch (err) {
    console.error("attachShopPlan error", err);
    next();
  }
}

/**
 * Enforce plan limits for timers:
 * - Free: max 1 active timer per shop.
 * - Pro: no enforced limit here.
 */
export async function enforceTimerPlanLimit(req, res, next) {
  try {
    const shop = (req.shop || "").toLowerCase();
    if (!shop) return res.status(400).json({ error: "Missing shop context" });

    let plan = req.shopPlan;
    if (!plan) {
      plan = await ShopPlan.findOne({ shop });
      if (!plan) {
        plan = await ShopPlan.create({ shop, plan: "free" });
      }
      req.shopPlan = plan;
    }

    if (plan.plan === "free") {
      const activeCount = await Timer.countDocuments({ shop });
      if (activeCount >= 1) {
        return res.status(402).json({
          error: "Free plan limit reached. Upgrade to create more timers.",
          code: "PLAN_LIMIT_REACHED",
          currentPlan: plan.plan,
          limit: 1,
        });
      }
    }

    next();
  } catch (err) {
    console.error("enforceTimerPlanLimit error", err);
    res.status(500).json({ error: "Failed to enforce plan limits" });
  }
}

/**
 * Simple endpoint helper to return plan info in a safe shape.
 */
export function serializePlan(plan) {
  if (!plan) {
    return { plan: "free" };
  }
  return {
    shop: plan.shop,
    plan: plan.plan,
    currentPeriodEnd: plan.currentPeriodEnd,
  };
}

