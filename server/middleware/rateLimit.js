/**
 * Rate limiting placeholder. In production, replace with in-memory or Redis-based limiter.
 * See README / docs/API.md for documented limits.
 */
export function rateLimitPlaceholder(_scope = "api") {
  return (_req, _res, next) => next();
}
