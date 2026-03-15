/**
 * Strip angle brackets and trim; limit length. Safe for plain-text display.
 * @param {string} str - Raw input
 * @param {number} [maxLen=2000] - Max length after trim
 * @returns {string}
 */
export function sanitizeString(str, maxLen = 2000) {
  if (typeof str !== "string") return "";
  return str.replace(/[<>]/g, "").trim().slice(0, maxLen);
}
