/**
 * Compute timer status from current time and startAt/endAt (fixed) or evergreen.
 * @param {{ type?: string, startAt?: string | Date, endAt?: string | Date }} timer
 * @returns {"active" | "scheduled" | "expired"}
 */
export function getTimerStatus(timer) {
  if (!timer) return "expired";
  if (timer.type === "evergreen") return "active";
  const now = Date.now();
  const start = timer.startAt ? new Date(timer.startAt).getTime() : 0;
  const end = timer.endAt ? new Date(timer.endAt).getTime() : 0;
  if (end < now) return "expired";
  if (start > now) return "scheduled";
  return "active";
}
