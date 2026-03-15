/**
 * Format an ISO date string for datetime-local input (local time).
 * The API returns UTC; datetime-local expects YYYY-MM-DDTHH:mm in local time.
 */
export function toLocalDateTimeString(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

/** Return { date: "YYYY-MM-DD", time: "HH:mm" } from an ISO or datetime-local string. */
export function toLocalDateAndTime(isoString) {
  if (!isoString) return { date: "", time: "" };
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return { date: `${y}-${m}-${day}`, time: `${h}:${min}` };
}

/**
 * Normalize a date string to "YYYY-MM-DD".
 * Accepts "YYYY-MM-DD" or "MM/DD/YYYY" or "M/D/YYYY", or a Date object.
 * Returns "" for empty/invalid.
 */
export function normalizeDateToYYYYMMDD(str) {
  if (str instanceof Date && !Number.isNaN(str.getTime())) {
    const y = str.getFullYear();
    const m = String(str.getMonth() + 1).padStart(2, "0");
    const d = String(str.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = typeof str === "string" ? str.trim() : String(str ?? "").trim();
  if (!s) return "";
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) {
    const y = parseInt(iso[1], 10);
    const m = parseInt(iso[2], 10);
    const d = parseInt(iso[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (mdy) {
    const m = parseInt(mdy[1], 10);
    const d = parseInt(mdy[2], 10);
    const y = parseInt(mdy[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  return "";
}

/**
 * Normalize a time string to 24h "HH:mm".
 * Accepts "HH:mm", "HH:mm:ss", "H:mm", "h:mm AM/PM", "hh:mm AM/PM", or a Date object.
 * (Native input type="time" may return "HH:mm:ss".)
 * Returns "" for empty/invalid.
 */
export function normalizeTimeToHHmm(str) {
  if (str instanceof Date && !Number.isNaN(str.getTime())) {
    const h = String(str.getHours()).padStart(2, "0");
    const m = String(str.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  const s = typeof str === "string" ? str.trim() : String(str ?? "").trim();
  if (!s) return "";
  const amPm = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(s);
  if (amPm) {
    let h = parseInt(amPm[1], 10);
    const m = parseInt(amPm[2], 10);
    if (amPm[3].toUpperCase() === "PM" && h !== 12) h += 12;
    if (amPm[3].toUpperCase() === "AM" && h === 12) h = 0;
    if (h < 0 || h > 23 || m < 0 || m > 59) return "";
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  // Match HH:mm or HH:mm:ss (native time input often includes seconds)
  const hm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (hm) {
    const h = parseInt(hm[1], 10);
    const m = parseInt(hm[2], 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return "";
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return "";
}

/** Combine date (YYYY-MM-DD or MM/DD/YYYY) and time (HH:mm or 12h) into ISO string. */
export function dateAndTimeToISO(dateStr, timeStr) {
  const dateNorm = normalizeDateToYYYYMMDD(dateStr);
  const timeNorm = normalizeTimeToHHmm(timeStr);
  if (!dateNorm || !timeNorm) return "";
  return new Date(`${dateNorm}T${timeNorm}`).toISOString();
}

/**
 * Convert hex (#rrggbb) to Polaris ColorPicker format { hue, saturation, brightness }.
 * Hue 0-360, saturation and brightness 0-1.
 */
export function hexToHsb(hex) {
  const h = hex.replace(/^#/, "");
  if (h.length !== 6) return { hue: 0, saturation: 0, brightness: 0 };
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const brightness = max;
  if (max === 0) return { hue: 0, saturation: 0, brightness: 0 };
  const d = max - min;
  const saturation = d / max;
  let hue = 0;
  if (d !== 0) {
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: hue = ((b - r) / d + 2) / 6; break;
      case b: hue = ((r - g) / d + 4) / 6; break;
    }
    hue *= 360;
  }
  return { hue: Math.round(hue), saturation, brightness };
}

/**
 * Convert Polaris { hue, saturation, brightness } to hex (#rrggbb).
 */
export function hsbToHex(h, s, b) {
  if (b === 0) return "#000000";
  const hue = h / 360;
  const i = Math.floor(hue * 6);
  const f = hue * 6 - i;
  const p = b * (1 - s);
  const q = b * (1 - f * s);
  const t = b * (1 - (1 - f) * s);
  let r = 0, g = 0, bl = 0;
  switch (i % 6) {
    case 0: r = b; g = t; bl = p; break;
    case 1: r = q; g = b; bl = p; break;
    case 2: r = p; g = b; bl = t; break;
    case 3: r = p; g = q; bl = b; break;
    case 4: r = t; g = p; bl = b; break;
    case 5: r = b; g = p; bl = q; break;
  }
  const toHex = (x) => {
    const n = Math.round(x * 255);
    const s = n.toString(16);
    return s.length === 1 ? "0" + s : s;
  };
  return "#" + toHex(r) + toHex(g) + toHex(bl);
}

export { getTimerStatus } from "./lib/status.js";
