/**
 * Countdown display. Fixed height to avoid CLS; handles fixed/evergreen, expired, and urgency.
 */
import { useState, useEffect, useRef } from "preact/hooks";
import { getEvergreenEndTime } from "./lib/evergreen.js";

const DEFAULT_PROMO = "YOUR SPECIAL OFFER ENDS IN";
const IMPRESSION_DELAY_MS = 1000;

function getEndTime(timer) {
  if (timer.type === "fixed" && timer.endAt) {
    return new Date(timer.endAt).getTime();
  }
  if (timer.type === "evergreen" && timer.durationSeconds) {
    return getEvergreenEndTime(timer.id, timer.durationSeconds);
  }
  return null;
}

function formatPart(n) {
  return n < 10 ? `0${n}` : String(n);
}

function getTimeLeft(endMs) {
  const now = Date.now();
  const d = Math.max(0, endMs - now);
  const days = Math.floor(d / 86400000);
  const h = Math.floor((d % 86400000) / 3600000);
  const m = Math.floor((d % 3600000) / 60000);
  const s = Math.floor((d % 60000) / 1000);
  return { days, h, m, s, expired: d <= 0 };
}

export function App({ config, timer, apiRoot }) {
  const endMs = getEndTime(timer);
  const [left, setLeft] = useState(() => getTimeLeft(endMs));
  const impressionSent = useRef(false);

  useEffect(() => {
    if (endMs == null || left.expired) return;
    const tick = () => setLeft(getTimeLeft(endMs));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endMs, left.expired]);

  useEffect(() => {
    if (impressionSent.current || left.expired) return;
    const t = setTimeout(() => {
      impressionSent.current = true;
      try {
        fetch(`${apiRoot}/api/storefront/impression`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shop: config.shop, timerId: timer.id }),
        }).catch(() => {});
      } catch {}
    }, IMPRESSION_DELAY_MS);
    return () => clearTimeout(t);
  }, [apiRoot, config.shop, timer.id, left.expired]);

  if (endMs == null) return null;
  if (left.expired) {
    return (
      <div
        className="countdown-timer-widget countdown-timer-widget--ended"
        style={getContainerStyle(timer)}
        aria-live="polite"
      >
        <span className="countdown-timer-widget__ended">Offer ended</span>
      </div>
    );
  }

  const thresholdSec = timer.urgencyThresholdSeconds ?? 300;
  const remainingSeconds = left.days * 86400 + left.h * 3600 + left.m * 60 + left.s;
  const isUrgency = timer.urgencyCue === "color_pulse" && remainingSeconds <= thresholdSec && remainingSeconds > 0;
  const urgencyClass = isUrgency ? " countdown-timer-widget--urgency" : "";
  const sizeClass = ` countdown-timer-widget--${timer.timerSize || "medium"}`;

  return (
    <>
      <style>{`
        .countdown-timer-widget__promo { font-weight: 600; margin-bottom: 4px; text-align: center; }
        .countdown-timer-widget__digits { font-variant-numeric: tabular-nums; font-weight: 700; }
        .countdown-timer-widget__sep { margin: 0 1px; opacity: 0.9; }
        .countdown-timer-widget__ended { font-style: italic; opacity: 0.9; }
        .countdown-timer-widget--urgency { animation: ct-pulse 1.5s ease-in-out infinite; }
        @keyframes ct-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.85; } }
      `}</style>
    <div
      className={`countdown-timer-widget${sizeClass}${urgencyClass}`}
      style={getContainerStyle(timer)}
      aria-live="polite"
      role="status"
      aria-label={`Countdown: ${left.days}d ${left.h}h ${left.m}m ${left.s}s left`}
    >
      <div className="countdown-timer-widget__promo">
        {timer.promotionDescription || DEFAULT_PROMO}
      </div>
      <div className="countdown-timer-widget__digits">
        {left.days > 0 && (
          <>
            <span>{formatPart(left.days)}</span>
            <span className="countdown-timer-widget__sep">d</span>
          </>
        )}
        <span>{formatPart(left.h)}</span>
        <span className="countdown-timer-widget__sep">:</span>
        <span>{formatPart(left.m)}</span>
        <span className="countdown-timer-widget__sep">:</span>
        <span>{formatPart(left.s)}</span>
      </div>
    </div>
    </>
  );
}

function getContainerStyle(timer) {
  const position = timer.timerPosition === "bottom" ? "flex-end" : "flex-start";
  const base = {
    minHeight: "52px",
    display: "flex",
    flexDirection: "column",
    justifyContent: position,
    alignItems: "center",
    padding: "10px 14px",
    boxSizing: "border-box",
    backgroundColor: timer.backgroundColor || "#f5f5f5",
    color: "#333",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: "14px",
    lineHeight: 1.3,
    borderRadius: "4px",
    margin: "8px 0",
  };
  if (timer.timerSize === "small") {
    base.fontSize = "12px";
    base.padding = "6px 10px";
    base.minHeight = "40px";
  } else if (timer.timerSize === "large") {
    base.fontSize = "16px";
    base.padding = "12px 18px";
    base.minHeight = "64px";
  }
  return base;
}
