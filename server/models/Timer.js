/**
 * Timer model. Multi-tenant: all queries must filter by shop.
 * Impression count is embedded on the document.
 */
import mongoose from "mongoose";

const timerSchema = new mongoose.Schema(
  {
    shop: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["fixed", "evergreen"],
    },
    startAt: { type: Date },
    endAt: { type: Date },
    durationSeconds: { type: Number },
    targetType: {
      type: String,
      enum: ["all", "products", "collections"],
      default: "all",
    },
    productIds: [{ type: String }],
    collectionIds: [{ type: String }],
    promotionDescription: { type: String, default: "" },
    backgroundColor: { type: String, default: "" },
    timerSize: { type: String, enum: ["small", "medium", "large"], default: "medium" },
    timerPosition: { type: String, enum: ["top", "bottom", "custom"], default: "top" },
    urgencyCue: { type: String, enum: ["color_pulse", "none", ""], default: "color_pulse" },
    /** Seconds before end when urgency cue (e.g. color pulse) activates. Default 300 (5 min). */
    urgencyThresholdSeconds: { type: Number, default: 300 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    impressionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Validate: fixed must have startAt/endAt; evergreen must have durationSeconds
timerSchema.pre("save", function (next) {
  if (this.type === "fixed" && (!this.startAt || !this.endAt)) {
    next(new Error("Fixed timer requires startAt and endAt"));
    return;
  }
  if (this.type === "evergreen" && (this.durationSeconds == null || this.durationSeconds <= 0)) {
    next(new Error("Evergreen timer requires durationSeconds > 0"));
    return;
  }
  next();
});

timerSchema.index({ shop: 1, createdAt: -1 });
timerSchema.index({ shop: 1, endAt: 1 });

const Timer = mongoose.models.Timer || mongoose.model("Timer", timerSchema);
export default Timer;
