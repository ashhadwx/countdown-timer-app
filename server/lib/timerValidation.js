/**
 * Timer request validation using Zod.
 * Validates types, required fields, enums, date ranges (end > start), duration > 0.
 * Sanitization (XSS) is applied in routes after parsing.
 */
import { z } from "zod";

const typeEnum = z.enum(["fixed", "evergreen"]);
const targetTypeEnum = z.enum(["all", "products", "collections"]);
const timerSizeEnum = z.enum(["small", "medium", "large"]);
const timerPositionEnum = z.enum(["top", "bottom", "custom"]);
const urgencyCueEnum = z.enum(["color_pulse", "none", ""]);
/** Allowed urgency thresholds: 60 (last minute) or 300 (last 5 minutes). */
const urgencyThresholdEnum = z.union([z.literal(60), z.literal(300)]).default(300);

const isoDate = z.coerce.date();

const baseFields = {
  name: z.string().min(1, "Timer name is required").max(2000),
  type: typeEnum.default("fixed"),
  targetType: targetTypeEnum.default("all"),
  productIds: z.array(z.string()).default([]),
  collectionIds: z.array(z.string()).default([]),
  promotionDescription: z.string().max(2000).default(""),
  backgroundColor: z.string().max(50).default(""),
  timerSize: timerSizeEnum.default("medium"),
  timerPosition: timerPositionEnum.default("top"),
  urgencyCue: urgencyCueEnum.default("color_pulse"),
  urgencyThresholdSeconds: urgencyThresholdEnum,
};

const fixedTimer = z.object({
  ...baseFields,
  type: z.literal("fixed"),
  startAt: isoDate,
  endAt: isoDate,
}).refine((data) => data.endAt > data.startAt, {
  message: "End date/time must be after start",
  path: ["endAt"],
});

const evergreenTimer = z.object({
  ...baseFields,
  type: z.literal("evergreen"),
  durationSeconds: z.number().int().min(1).max(86400),
});

/** For POST /api/timers — create (all required fields per type) */
export const createTimerSchema = z.discriminatedUnion("type", [
  fixedTimer,
  evergreenTimer,
]);

/**
 * Normalize body for create: ensure type default, coerce dates/numbers from strings.
 */
function normalizeBody(body, existing = null) {
  const src = existing ? { ...existing, ...body } : body;
  const raw = {
    ...src,
    type: src.type === "evergreen" ? "evergreen" : "fixed",
    targetType: ["all", "products", "collections"].includes(src.targetType) ? src.targetType : "all",
    timerSize: ["small", "medium", "large"].includes(src.timerSize) ? src.timerSize : "medium",
    timerPosition: ["top", "bottom", "custom"].includes(src.timerPosition) ? src.timerPosition : "top",
    urgencyCue: ["color_pulse", "none", ""].includes(src.urgencyCue) ? src.urgencyCue : "color_pulse",
    urgencyThresholdSeconds: [60, 300].includes(Number(src.urgencyThresholdSeconds)) ? Number(src.urgencyThresholdSeconds) : 300,
    productIds: Array.isArray(src.productIds) ? src.productIds : [],
    collectionIds: Array.isArray(src.collectionIds) ? src.collectionIds : [],
  };
  if (raw.type === "fixed") {
    raw.startAt = src.startAt != null ? (src.startAt instanceof Date ? src.startAt : new Date(src.startAt)) : undefined;
    raw.endAt = src.endAt != null ? (src.endAt instanceof Date ? src.endAt : new Date(src.endAt)) : undefined;
  } else {
    const sec = Number(src.durationSeconds);
    raw.durationSeconds = Number.isFinite(sec) ? Math.max(1, Math.min(86400, Math.floor(sec))) : 600;
  }
  return raw;
}

export function parseCreateBody(body) {
  const raw = normalizeBody(body);
  return createTimerSchema.parse(raw);
}

/**
 * Parse for update; merges with existing then validates full shape.
 */
export function parseUpdateBody(body, existing) {
  const merged = existing.toObject ? existing.toObject() : { ...existing };
  const raw = normalizeBody(body, merged);
  return createTimerSchema.parse(raw);
}

/**
 * Return consistent error response for 400: { error, details? }.
 */
export function validationErrorResponse(res, zodError) {
  const first = zodError.errors[0];
  const message = first ? `${first.path.join(".")}: ${first.message}` : "Validation failed";
  const details = zodError.errors.length > 1
    ? zodError.errors.map((e) => ({ path: e.path.join("."), message: e.message }))
    : undefined;
  return res.status(400).json({ error: message, ...(details && { details }) });
}
