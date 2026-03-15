# Countdown Timer API

REST API for timer CRUD (admin) and a single storefront endpoint for the widget. All admin endpoints require an authenticated Shopify session; the storefront endpoint validates `shop` from the query.

**Validation:** Request bodies and params are validated with [Zod](https://zod.dev/) (types, required fields, enums, date ranges, duration). String inputs are then sanitized (XSS prevention) before storage.

## Error responses

All errors use a consistent JSON shape:

```json
{ "error": "Short message" }
```

Optional: `details` or `message` for extra context. Stack traces and DB details are never returned in production.

| Code | Meaning |
|------|--------|
| 400 | Bad Request — validation (invalid body, dates, missing fields) |
| 401 | Unauthorized — missing or invalid auth/session |
| 403 | Forbidden — valid auth but not allowed (e.g. wrong shop) |
| 404 | Not Found — timer ID not found or not belonging to shop |
| 500 | Internal Server Error — unexpected server error |

---

## Admin endpoints (session required)

All require `shopify.validateAuthenticatedSession()` and `attachShopFromSession`; `shop` is derived from the session and all queries are scoped by it.

### GET `/api/timers`

List all timers for the current shop.

- **Auth:** Session/shop
- **Response:** `200` — JSON array of timer objects
- **Errors:** `401` (no session), `500`

### GET `/api/timers/:id`

Get one timer by ID.

- **Auth:** Session/shop
- **Params:** `id` — MongoDB ObjectId
- **Response:** `200` — single timer object
- **Errors:** `400` (invalid ID), `401`, `404`, `500`

### POST `/api/timers`

Create a timer.

- **Auth:** Session/shop
- **Body:** JSON — `name` (required), `type` (`fixed` \| `evergreen`), `targetType`, `productIds`, `collectionIds`, `promotionDescription`, `backgroundColor`, `timerSize`, `timerPosition`, `urgencyCue` (`color_pulse` \| `none`), `urgencyThresholdSeconds` (optional, `60` or `300`; default `300` = last 5 minutes); for `fixed`: `startAt`, `endAt`; for `evergreen`: `durationSeconds`
- **Response:** `201` — created timer object
- **Errors:** `400` (validation), `401`, `500`

### PATCH `/api/timers/:id`

Update a timer.

- **Auth:** Session/shop
- **Params:** `id` — MongoDB ObjectId
- **Body:** JSON — same fields as POST (partial update)
- **Response:** `200` — updated timer object
- **Errors:** `400` (validation), `401`, `404`, `500`

### DELETE `/api/timers/:id`

Delete a timer.

- **Auth:** Session/shop
- **Params:** `id` — MongoDB ObjectId
- **Response:** `204` No Content
- **Errors:** `400` (invalid ID), `401`, `404`, `500`

### GET `/api/shop/products`

List products for Resource Picker (GraphQL).

- **Auth:** Session/shop
- **Response:** `200` — `[{ id, title }, ...]`
- **Errors:** `401`, `500`

### GET `/api/shop/collections`

List collections for Resource Picker (GraphQL).

- **Auth:** Session/shop
- **Response:** `200` — `[{ id, title }, ...]`
- **Errors:** `401`, `500`

---

## Storefront endpoint (no session)

### GET `/api/storefront/timer`

Single optimized call for the storefront widget: returns one active timer that matches the given shop and targeting context, or no content.

- **Auth:** None (shop validated via query)
- **Query:**
  - `shop` (required) — store domain, e.g. `mystore.myshopify.com`
  - `productId` (optional) — Shopify product GID, e.g. `gid://shopify/Product/123`
  - `collectionIds` (optional) — comma-separated collection GIDs
- **Response:** `200` — single timer config (minimal fields) or `204` No Content
- **Errors:** `401` (missing/invalid shop), `500`

**Response shape (200):**

```json
{
  "id": "mongoId",
  "type": "fixed",
  "promotionDescription": "...",
  "backgroundColor": "#fff",
  "timerSize": "medium",
  "timerPosition": "top",
  "urgencyCue": "color_pulse",
  "urgencyThresholdSeconds": 300,
  "startAt": "2025-03-01T00:00:00.000Z",
  "endAt": "2025-03-15T23:59:59.000Z"
}
```

For `type: "evergreen"`, `durationSeconds` is included instead of `startAt`/`endAt`.

**Caching:** Response includes `Cache-Control: public, max-age=60` (60 seconds). Documented in README.

### POST `/api/storefront/impression`

Record one impression (view) for a timer when the storefront widget displays it.

- **Auth:** None (shop validated via body)
- **Body:** `{ "shop": "store.myshopify.com", "timerId": "mongoObjectId" }`
- **Response:** `204` No Content
- **Errors:** `400` (missing/invalid timerId), `401` (missing/invalid shop), `404` (timer not found or wrong shop), `500`

---

## Rate limiting

- **Admin API:** Per-shop limit (e.g. 100 req/min). Placeholder middleware in place; implement in production (in-memory or Redis).
- **Storefront API:** Per-shop or per-IP limit (e.g. 60 req/min per shop). Placeholder middleware in place.

See README for the documented approach and placeholder location.
