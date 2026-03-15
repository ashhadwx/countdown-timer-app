/**
 * Evergreen timer end time from session storage. First visit sets end = now + duration; expired triggers reset.
 */
const STORAGE_PREFIX = "ct_end_";

/**
 * Get or set evergreen end timestamp. Uses storage (sessionStorage by default).
 * @param {string} timerId - Timer id
 * @param {number} durationSeconds - Duration in seconds
 * @param {{ getItem: (k: string) => string | null, setItem: (k: string, v: string) => void }} [storage] - Optional storage (default sessionStorage)
 * @returns {number} End time in ms
 */
export function getEvergreenEndTime(timerId, durationSeconds, storage = typeof sessionStorage !== "undefined" ? sessionStorage : null) {
  const key = `${STORAGE_PREFIX}${timerId}`;
  const now = Date.now();
  if (!storage) return now + durationSeconds * 1000;
  try {
    const stored = storage.getItem(key);
    const end = stored ? parseInt(stored, 10) : null;
    if (end != null && end > now) return end;
    const newEnd = now + durationSeconds * 1000;
    storage.setItem(key, String(newEnd));
    return newEnd;
  } catch {
    return now + durationSeconds * 1000;
  }
}
