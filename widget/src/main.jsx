/**
 * Countdown Timer storefront widget entry.
 * Reads config from window.__COUNTDOWN_TIMER_CONFIG__, fetches timer once, mounts Preact or does nothing.
 * Wrapped in try/catch so widget never breaks the storefront.
 */
import { render } from "preact";
import { App } from "./App.jsx";

async function run() {
  const CONFIG = typeof window !== "undefined" && window.__COUNTDOWN_TIMER_CONFIG__;
  if (!CONFIG?.shop) return;

  const apiRoot = (CONFIG.apiRoot || "").trim() || `${typeof window !== "undefined" ? window.location.origin : ""}/apps/countdown`;
  const params = new URLSearchParams({ shop: CONFIG.shop, productId: CONFIG.productId || "" });
  const ids = CONFIG.collectionIds;
  if (ids && Array.isArray(ids) && ids.length > 0) {
    params.set("collectionIds", ids.filter(Boolean).join(","));
  }
  const timerUrl = `${apiRoot.replace(/\/$/, "")}/api/storefront/timer?${params.toString()}`;

  let res;
  try {
    res = await fetch(timerUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return;
  }

  if (res.status === 204 || res.status === 404) return;
  if (!res.ok) return;

  let data;
  try {
    data = await res.json();
  } catch {
    return;
  }
  if (!data || typeof data !== "object" || !data.id) return;

  const root = document.getElementById("countdown-timer-root");
  if (!root) return;
  try {
    render(<App config={CONFIG} timer={data} apiRoot={apiRoot.replace(/\/$/, "")} />, root);
  } catch {
    // Widget render failed; fail silently so storefront is not broken
  }
}

try {
  run();
} catch {
  // Widget failed to start; fail silently
}
