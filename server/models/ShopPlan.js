/**
 * ShopPlan model.
 * Stores the current billing plan for each shop (e.g. "free", "pro").
 */
import mongoose from "../lib/db.js";

const shopPlanSchema = new mongoose.Schema(
  {
    shop: { type: String, required: true, unique: true, index: true },
    plan: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
      required: true,
    },
    // Optionally track when the plan started or trial info later.
    currentPeriodEnd: { type: Date },
  },
  { timestamps: true }
);

const ShopPlan =
  mongoose.models.ShopPlan || mongoose.model("ShopPlan", shopPlanSchema);

export default ShopPlan;

