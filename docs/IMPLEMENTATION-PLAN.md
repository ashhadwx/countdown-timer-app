## Countdown Timer + Analytics — Interview Q&A

Use this document to prepare for interviews based on this project. Answers are phrased as you might say them in a conversation; customize wording to your style.

---

## 1. High‑Level Project Questions

**Q1. What does this Countdown Timer + Analytics app do?**

**A:** It’s a Shopify app that lets merchants configure countdown timers for promotions and show them on product pages. Merchants can create fixed or evergreen timers, target them to specific products or collections, customize styling, and see basic analytics like impression counts per timer. On the storefront, a lightweight Preact widget calls a storefront API endpoint to fetch one active timer per context and render the countdown without causing layout shifts.

---

**Q2. What is the overall architecture of the app?**

**A:** The app has four main layers:

- **Admin app**: A React + Shopify Polaris SPA embedded in Shopify admin where merchants create and manage timers.
- **Backend**: A Node.js + Express API that handles Shopify OAuth, timer CRUD, analytics, and serves the admin build.
- **Database**: MongoDB for storing timer configurations and an embedded `impressionCount` field for basic analytics.
- **Storefront widget + theme extension**: A Preact widget bundled into a Theme App Extension block that merchants can add to product sections. The widget talks to `/api/storefront/timer` and `/api/storefront/impression` via a Shopify App Proxy.

---

**Q3. Why did you choose this tech stack (Node, React, Mongo, Preact, Theme App Extension)?**

**A:** I used Shopify’s official Node template as a base, so Node + Express and React + Polaris are the recommended stack. MongoDB works well because the timer configuration is document‑shaped and evolves over time; we don’t need complex relational joins. For the storefront, I chose Preact to keep the widget bundle very small and fast. And instead of legacy ScriptTags, I used a Theme App Extension so merchants can add the countdown block through the theme editor, which is the modern and more flexible approach.

---

## 2. Backend & API Questions

**Q4. How are the main API endpoints designed?**

**A:** There are two main groups:

- **Admin endpoints (session required)**: `/api/timers` for CRUD and `/api/shop/products` and `/api/shop/collections` for selecting targets. They use Shopify’s `validateAuthenticatedSession` middleware, derive `shop` from the session, and always scope Mongo queries by `shop`.
- **Storefront endpoints (no session)**: `GET /api/storefront/timer` returns a minimal timer config for the widget. `POST /api/storefront/impression` increments `impressionCount`. These validate the `shop` domain from query/body and ensure the timer belongs to that shop.

All endpoints return errors in a consistent `{ "error": "Short message" }` shape with appropriate HTTP codes.

---

**Q5. How do you validate and sanitize input on the backend?**

**A:** I use Zod schemas to validate request bodies and params. Zod enforces types (strings, numbers, enums), required fields, and business rules like `startAt < endAt` for fixed timers or allowed values for `urgencyThresholdSeconds`. After validation, string fields are run through a sanitizer that strips angle brackets to reduce XSS risks. Invalid inputs result in a `400` response with a short error message; stacks and DB internals are never returned in production.

---

**Q6. How do you ensure multi‑tenant isolation between different Shopify stores?**

**A:** Every timer and analytics record is scoped by `shop`, which is the store’s domain like `myshop.myshopify.com`. On admin endpoints, I don’t trust the client; I get `shop` from the Shopify session and include it in every Mongo query filter, for example `{ _id: id, shop: req.shop }`. Storefront endpoints also validate that `timerId` belongs to the given `shop` before incrementing analytics. Mongo indexes start with `shop` to keep these queries efficient.

---

**Q7. How does the impression tracking work?**

**A:** When the widget actually displays a timer on the storefront, it waits about a second to ensure it’s visible and then fires `POST /api/storefront/impression` with `{ shop, timerId }`. The server validates that the timer belongs to the shop and then uses a Mongo `$inc` update on the timer document’s `impressionCount` field. The endpoint returns `204 No Content`. We intentionally track one impression per page load per timer; we don’t do session‑level deduplication, because this is meant to be a simple “how many times was this timer seen” metric.

---

**Q8. How do you handle rate limiting?**

**A:** There’s a placeholder middleware (`server/middleware/rateLimit.js`) wired into admin and storefront routes. The documented intention is to apply per‑shop limits, for example 100 req/min for admin and 60 req/min for storefront per shop or per IP. For a production version, I would back that middleware with an in‑memory store like a token bucket or preferably a Redis‑backed rate limiter to make it work across multiple instances. The API docs and README both call out where this middleware plugs in.

---

## 3. Data & MongoDB Questions

**Q9. Can you describe the timer data model?**

**A:** Conceptually, a timer document looks like:

- `shop`: store domain, used for multi‑tenant scoping.
- `name`, `promotionDescription`: merchant‑facing fields.
- `type`: `"fixed"` or `"evergreen"`.
- Targeting: `targetType` (`all`, `products`, `collections`), with `productIds` and `collectionIds` arrays.
- Time: `startAt` and `endAt` for fixed timers, or `durationSeconds` for evergreen timers.
- Display: `backgroundColor`, `timerSize`, `timerPosition`, `urgencyCue`, `urgencyThresholdSeconds`.
- Analytics: `impressionCount`.
- Timestamps and indexes like `{ shop: 1, createdAt: -1 }` and `{ shop: 1, endAt: 1 }`.

That gives us flexible configuration while keeping queries efficient.

---

**Q10. Why store `impressionCount` embedded on the timer instead of in a separate collection?**

**A:** The analytics requirement is deliberately simple: we only need total impressions per timer, not a detailed event log or time series. Embedding `impressionCount` directly on the timer document lets us use a single `$inc` update and read the value in the same query as the timer. It’s cheaper and simpler than maintaining a separate `Impression` collection. If we later needed detailed analytics (e.g. impressions per day), we could add an event table or roll‑up collection.

---

**Q11. How do evergreen timers work internally?**

**A:** An evergreen timer is defined by a `durationSeconds` field instead of start/end timestamps. On the storefront, the widget uses `sessionStorage` to store a per‑session expiry timestamp. When a user first sees the timer, we set `expiry = now + durationSeconds` and store it in `sessionStorage`. On subsequent renders within that session, we read that expiry and compute the remaining time. When the session ends (new tab or browser close), `sessionStorage` is cleared and the evergreen countdown restarts.

---

## 4. Frontend & UX Questions (Admin + Widget)

**Q12. How is the admin UI implemented?**

**A:** The admin UI is a React app in `admin-app/` built with Vite and Shopify Polaris. It uses file‑based routing from Shopify’s template and React Query to talk to the backend. There’s a timer list page that calls `GET /api/timers` and shows timers and their `impressionCount`, and a create/edit form that maps directly to the timer schema (type, dates/duration, targeting, styling, urgency options). Resource pickers use `/api/shop/products` and `/api/shop/collections` to let merchants target specific products or collections. The app runs embedded in Shopify admin and uses App Bridge to handle auth and navigation.

---

**Q13. How does the storefront widget work, and why Preact?**

**A:** The widget is a small Preact app that’s built as a single IIFE bundle and loaded via the theme app extension block. When it mounts, it calls `GET /api/storefront/timer` with `shop`, `productId`, and optional `collectionIds`. If the response is `204`, it renders nothing. If a timer is returned, the widget computes the remaining time based on `type` and either `endAt` or `durationSeconds`, then renders the countdown. It also sends a single impression event per view. Preact was chosen to reduce bundle size—there’s no need for full React on the storefront, and the current gzipped bundle is around 7 KB, well under the 30 KB budget enforced by `npm run build:widget:check`.

---

**Q14. How do you avoid layout shifts (CLS) on the storefront?**

**A:** The widget reserves space for the countdown by rendering a container with a minimum height before the timer content loads. If the API returns `204` or an error, the widget simply does not render the countdown content, but the overall layout doesn’t jump because the reserved space is small and consistent. The script itself is loaded with `defer`, so it doesn’t block initial rendering of the page, and the theme extension ensures the markup placement is stable.

---

**Q15. How is urgency communicated to the user?**

**A:** There’s a configuration field called `urgencyCue` which can be `"color_pulse"` or `"none"`, and an `urgencyThresholdSeconds` field that’s typically 300 seconds (last 5 minutes) or 60 seconds. The widget checks the remaining time, and when it drops below the threshold and `urgencyCue` is set to `color_pulse`, it adds a CSS class that applies a subtle color pulse animation. That gives a sense of urgency without being too distracting.

---

## 5. Shopify‑Specific Questions

**Q16. How does the Theme App Extension integrate with the app?**

**A:** The extension lives in `theme-extension/countdown-timer/`. It defines a single app block called “Countdown Timer” that merchants can add to a product section in the theme editor. The block includes HTML markup for the widget container and references the built `countdown-widget.js` asset. When the product page loads, the script runs, detects the context (shop, product ID, collections), and calls the app via a Shopify App Proxy. This approach makes the integration fully configurable via the theme editor without manual theme code edits.

---

**Q17. What is an App Proxy and how are you using it?**

**A:** An App Proxy is a Shopify feature that lets a storefront URL like `/apps/countdown/...` be forwarded to your app’s backend, with Shopify signing the request. In `shopify.app.toml`, the app sets prefix `apps` and subpath `countdown`. When the widget makes a call like `/apps/countdown/api/storefront/timer`, Shopify forwards that to the app URL. This keeps the request same‑origin from the store’s perspective and allows the app to validate that the request really comes from Shopify, which is important for public storefront endpoints.

---

**Q18. How do you handle development with theme preview and store passwords?**

**A:** The README documents a couple of things:

- Theme preview URLs (`shopifypreview.com`) can cause cross‑origin issues, so the recommended way to test is to open the store’s actual product URL in a new tab while the app is running via `npm run dev`.
- If the store has a password, you can still test by running the app locally, adding the block in the theme editor, then opening the storefront URL, entering the password, and letting the proxy route requests to the dev tunnel. The app doesn’t rely on the `shopify app dev` theme preview URL.

---

## 6. Testing & Quality Questions

**Q19. What aspects of the app are tested?**

**A:** Unit tests in the `tests/` directory focus on the core business logic:

- Timer validation: ensures fixed timers have valid date ranges, evergreen timers have positive durations, and enums like `type` and `urgencyCue` are enforced.
- Evergreen timer logic: validates that the countdown uses session‑scoped expiry and handles edge cases like session restart.
- Targeting logic: ensures the correct timer is selected given a product and collection context.
- Analytics logic: verifies that impression increments only when appropriate and that invalid `timerId` or `shop` combinations are rejected.

I also use ESLint across server, admin, and widget with a shared config to catch common issues.

---

**Q20. How would you extend the testing strategy in a production environment?**

**A:** In production I would:

- Add integration tests hitting the actual Express endpoints with an in‑memory MongoDB to cover full request/response cycles.
- Add UI tests for the admin app using something like Playwright or Cypress, focusing on timer creation/edit flows.
- Add snapshot or DOM‑based tests for the widget to ensure it renders correctly in different timer configurations and edge cases (no timer, expired timer, evergreen timer).
- Potentially add contract tests between admin and backend so that changes in the API shape don’t silently break the UI.

---

## 7. Performance & Security Questions (Trickier)

**Q21. How do you keep the storefront performance‑friendly?**

**A:** I focus on three things:

1. **Small widget bundle**: Built with Preact and minimal dependencies; gzipped size is ~7 KB and enforced to be under 30 KB.
2. **Efficient API**: The storefront timer endpoint uses Mongo indexes, lean queries, and returns only the fields needed for rendering. Responses are cacheable with `Cache-Control: public, max-age=60`, so repeated views within a short window often hit a cached response.
3. **No visual jitter**: The widget reserves space and avoids rendering when there’s no active timer, preventing CLS. The script is loaded with `defer` so it doesn’t block page rendering.

---

**Q22. If the widget’s API call becomes a bottleneck, how would you optimize it further?**  *(Tricky)*

**A:** There are several levers:

- **Database level**: Make sure indexes fully cover the query pattern (e.g. `shop` + `endAt` + targeting fields) and use `.lean()` consistently.
- **Caching**: In addition to `Cache-Control` headers, introduce server‑side caching per shop/product combination, either in memory or with Redis. Since the timer doesn’t change every second, caching for 60 seconds is usually safe.
- **Batching / pre‑computation**: For high‑traffic stores, pre‑compute the “active timer per product” mapping and cache it by product ID, so the runtime query is a simple lookup.
- **Network**: Use a CDN at the edge for the widget and possibly for a “pre‑computed active timer” JSON API if it’s cacheable enough.

I’d choose the simplest approach that solves the observed bottleneck, starting with indexes and short‑lived caching.

---

**Q23. How do you prevent cross‑shop data leaks? What could go wrong if you made a mistake here?**  *(Tricky)*

**A:** I prevent cross‑shop leaks by:

- Deriving `shop` from the Shopify session for admin routes and never trusting client‑provided shop identifiers.
- Including `shop` in every Mongo query filter, not just using `_id`.
- Validating `shop` in storefront endpoints and checking that a given `timerId` belongs to that shop before returning or updating it.

If I made a mistake—like looking up timers only by `_id` without `shop`—it could allow a store to accidentally read or update another store’s timers, which is a serious data privacy violation and would likely get the app rejected or delisted. That’s why all multi‑tenant code paths are documented and tested carefully.

---

**Q24. How would you protect the storefront endpoints from abuse, given they don’t use a session?**  *(Tricky)*

**A:** A few layers:

- **Shop validation**: Only allow `*.myshopify.com` domains for the `shop` parameter and reject anything else.
- **App Proxy verification**: In a full production setup, verify the HMAC signature Shopify attaches to app proxy requests so only Shopify‑routed requests are honored.
- **Rate limiting**: Bound requests per shop or per IP to prevent scraping or DoS attempts.
- **Input validation**: Validate `productId`, `collectionIds`, and `timerId` shapes strictly to avoid injection or accidental heavy queries.

Together these make the storefront endpoints safe even though they don’t rely on a user session.

---

## 8. “How Would You Change X?” Design Questions

**Q25. How would you extend this app to support multiple timers on the same product?**

**A:** I’d make three main changes:

- **Data model**: Allow multiple timers to target the same product or collection, and add a field like `priority` or `placement` so we can control ordering.
- **Storefront API**: Update `/api/storefront/timer` to either return an array of timers or introduce a new endpoint like `/api/storefront/timers`. The widget would then decide how to display multiple timers (stacked, carousel, or only the highest‑priority one).
- **Admin UX**: Update the admin list and edit screens to show priority and possibly placement zones (e.g. “above price” vs “below add to cart”), and warn merchants if multiple timers target the same product.

Backward compatibility would be handled by continuing to support the single‑timer shape for older widgets.

---

**Q26. How would you evolve the analytics from simple counts to time‑series reporting?**  *(Tricky)*

**A:** I’d introduce a dedicated analytics pipeline:

- **Event collection**: Add a new `TimerImpression` collection where each event stores `timerId`, `shop`, timestamp, and maybe some basic context like device type.
- **Roll‑ups**: Periodically aggregate events into daily or hourly buckets per timer, storing those in a `TimerImpressionStats` collection.
- **Admin UI**: Show charts or spark lines for impressions over time in the timer detail view.
- **Migration**: Keep the existing `impressionCount` field as a quick summary while the new stats are being built.

I’d also monitor storage and indexing carefully to avoid making impressions the bottleneck.

---

**Q27. If you had to deploy this app to production, what would your checklist look like?**

**A:** 

- **Config & secrets**: Set `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `MONGODB_URI`, and `NODE_ENV=production` in the hosting environment.
- **Database**: Use a managed MongoDB cluster, configure indexes, and set appropriate backups and monitoring.
- **Sessions**: For scaling beyond a single instance, move session storage from SQLite to a shared store like Postgres, MySQL, or Redis using Shopify’s session storage adapters.
- **Security**: Enforce HTTPS, verify app proxy signatures, audit CORS, and double‑check all external input validation.
- **Performance**: Run load tests on `/api/storefront/timer` and add server‑side caching if necessary.
- **Monitoring**: Set up logging, metrics, and alerts for errors, latency, and Mongo performance.

This ensures the app is reliable and secure in a real merchant environment.

---

## 9. File‑Level / “Where is X Implemented?” Questions

**Q28. If I ask you “Where is the timer model implemented?” what would you say?**

**A:** The MongoDB timer model is in `server/models/Timer.js`. That file defines the Mongoose schema with fields like `shop`, `type`, `targetType`, `productIds`, `collectionIds`, `startAt`, `endAt`, `durationSeconds`, styling fields, and `impressionCount`, along with timestamps and indexes that start with `shop`.

---

**Q29. Where do you validate timer payloads before saving to the database?**

**A:** Validation logic lives in `server/lib/timerValidation.js`. It uses Zod schemas to validate request bodies for `POST /api/timers` and `PATCH /api/timers/:id`. The route handlers in `server/routes/timers.js` call into these validators and only proceed to `Timer.create` or `Timer.findOneAndUpdate` when the payload passes validation and sanitization.

---

**Q30. Where is the logic that decides which timer to show on a product page?**

**A:** That’s in `server/lib/targeting.js`. It takes the current `shop`, `productId`, and optional `collectionIds`, queries Mongo for timers matching that shop, and applies business rules to select the best active timer—checking date windows for fixed timers, using `durationSeconds` for evergreen timers, and respecting `targetType` and ID lists. The `GET /api/storefront/timer` route in `server/routes/storefront.js` calls into this helper.

---

**Q31. Where is the evergreen countdown logic on the frontend?**

**A:** The evergreen logic is encapsulated in `widget/src/lib/evergreen.js`. It exposes helpers that read and write an expiry timestamp in `sessionStorage`, based on `durationSeconds`. `widget/src/App.jsx` calls these helpers to compute how much time is left and to reset the expiry when needed, while the React/Preact component focuses on UI rendering.

---

**Q32. Where is the main storefront widget component, and what does it contain?**

**A:** The main component is in `widget/src/App.jsx`. It is responsible for:

- Reading the `shop`, `productId`, and `collectionIds` context.
- Fetching the timer from `/api/storefront/timer`.
- Choosing fixed vs evergreen countdown behavior.
- Applying styling and urgency cues.
- Triggering the impression event via `POST /api/storefront/impression`.

The entry point `widget/src/main.jsx` simply mounts `App` into the DOM element created by the theme block.

---

**Q33. Where are the theme extension files, and what does each one do?**

**A:** In `theme-extension/countdown-timer/`:

- `shopify.extension.toml` describes the extension metadata.
- `blocks/countdown.liquid` defines the countdown app block and includes the script and container.
- `assets/countdown-widget.js` is the built widget bundle from the Preact project.
- `locales/en.default.schema.json` defines the block’s settings and labels for the theme editor.

---

**Q34. Where do you configure the App Proxy?**

**A:** In the root `shopify.app.toml` file, inside the `[app_proxy]` section. It sets the proxy prefix to `apps`, the subpath to `countdown`, and the target URL to the app’s backend URL, which the Shopify CLI updates when you run `npm run dev`.

---

## 10. Personal Contribution / Process Questions

**Q35. What parts of this project are you most comfortable explaining in depth?**

**A:** I’m most comfortable with the backend API and the storefront widget. I can walk through how the `/api/timers` routes validate and persist data with Mongo, how multi‑tenancy is enforced, and how the targeting logic picks the correct timer. On the frontend, I’m very familiar with the widget’s data flow—how it fetches from `/api/storefront/timer`, handles evergreen timers, tracks impressions, and avoids layout shifts.

---

**Q36. If you had more time to work on this app, what would you improve next?**

**A:** I’d focus on three areas:

- Improving analytics from simple counts to trends over time, likely adding a dedicated analytics pipeline.
- Hardening security further by implementing full app proxy HMAC verification and production‑grade rate limiting.
- Polishing the admin UX with richer validation messages, previewing the timer look directly in the form, and possibly adding A/B test support for different timer configurations.

---

**Q37. What was the most challenging part of designing this app, and how did you handle it?**

**A:** The trickiest part conceptually was handling multi‑tenancy and storefront performance together. It’s easy to accidentally write queries that don’t include `shop` and risk cross‑shop data leakage, or to add too many conditions and hurt performance. I handled it by:

- Making `shop` a required part of the schema and indexes.
- Ensuring all queries in `routes/timers.js` and `routes/storefront.js` explicitly filter by `shop`.
- Documenting this in the README and tests so it’s clear that this is a non‑negotiable design constraint.

---

## 11. Edge Cases & Failure Handling

**Q38. What happens if there is no active timer for a product?**

**A:** In that case, the `/api/storefront/timer` endpoint returns `204 No Content`. The widget interprets that as “no timer,” doesn’t render any countdown UI, and does not send an impression. This is important for UX because the page doesn’t show a broken or empty component, and it helps avoid layout shifts.

---

**Q39. How does the app behave if the MongoDB database is down?**

**A:** If Mongo is down at startup, `server/lib/db.js` will fail to connect and the server should log the error and exit rather than start in a bad state. If the DB goes down at runtime, API calls to `/api/timers` or `/api/storefront/timer` will throw errors, which are caught by Express error handlers and turned into `500` responses with `{ "error": "Internal Server Error" }` style messages. Stack traces are not exposed to the client; they’re logged server‑side. From an operational perspective, you’d monitor DB health and restart or fail over as needed.

---

**Q40. What happens if someone sends invalid data to the timer endpoints?**

**A:** Zod validation in `server/lib/timerValidation.js` will catch invalid types, missing fields, or inconsistent dates and return a `400 Bad Request` with a short error message. Because the validation happens before any Mongo call, no bad data is written to the database. On the admin side, those error messages are surfaced in the UI so merchants can fix the input.

---

**Q41. How does the app handle a user with JavaScript disabled on the storefront?**

**A:** If JavaScript is disabled, the Preact widget bundle won’t run, so no countdown is rendered. The theme block still outputs some basic markup, which can include a fallback message like “Promotion running now,” but the dynamic countdown won’t appear. That’s acceptable for this app because it’s an enhancement rather than a core checkout blocker, but if necessary we could render a static version server‑side.

---

## 12. Conceptual / Theory Questions Tied to This App

**Q42. What is the difference between `localStorage` and `sessionStorage`, and why did you choose `sessionStorage` for evergreen timers?**

**A:** `localStorage` persists data across browser sessions until it’s explicitly cleared, while `sessionStorage` is scoped to a single tab or window and is cleared when the tab or window is closed. For evergreen timers, I chose `sessionStorage` because the idea is “evergreen per session”—you want the timer to reset for a new browsing session, not to stick forever for that user. Using `sessionStorage` gives exactly that behavior.

---

**Q43. Why is caching (`Cache-Control: public, max-age=60`) safe for the storefront timer response?**

**A:** The timer config changes infrequently relative to page loads, and we only need rough real‑time accuracy for the countdown. Caching responses for 60 seconds means:

- We significantly reduce load on the backend for high‑traffic products.
- A timer change in the admin might take up to a minute to fully propagate, which is acceptable for most marketing scenarios.

Because the cache duration is short and the timer’s `endAt` is included in the payload, the widget can still base the countdown on the true expiration time.

---

**Q44. How does using Preact instead of React impact the bundle and developer experience?**

**A:** Preact provides a very similar API to React—JSX, functional components, hooks—but with a much smaller runtime footprint. For the bundle:

- It reduces the JS size, which is critical on storefronts where every kilobyte matters.

For developer experience:

- There’s a small learning curve for some differences and compatibility, but for a self‑contained widget using modern JSX and hooks, the code looks almost identical to React code.

---

**Q45. What are the pros and cons of embedding analytics directly on the timer document?**

**A:** 

- **Pros**:
  - Simple implementation: a single `$inc` query.
  - Easy to read: the admin UI can show `impressionCount` without an extra join.
  - Works well for basic total counts.
- **Cons**:
  - Harder to get time‑series or segmented analytics.
  - If traffic becomes very high, concurrent `$inc` operations on the same document could become a contention hot spot, though Mongo handles this reasonably well.

It’s a good fit for this app’s current scope, but I’d switch to an event‑based model for advanced reporting.

---

## 13. Node.js / Express‑Specific Questions

**Q46. Why is Node.js + Express a good fit for this Shopify app?**

**A:** Node.js fits well because Shopify’s Admin APIs and the storefront widget both speak HTTP+JSON, and Node allows a single language (JavaScript/TypeScript) across backend and frontend. Express is lightweight and unopinionated, which works nicely with Shopify’s own middleware and session handling from the Shopify API library. It’s straightforward to add custom middleware for things like rate limiting, shop validation, and error handling without fighting the framework.

---

**Q47. How do you organize Express routes and middleware in this project?**

**A:** I organize routes by concern:

- `server/routes/timers.js` handles admin timer CRUD.
- `server/routes/storefront.js` handles public storefront endpoints.

Shared cross‑cutting behavior lives in middleware and lib files:

- Middleware like `server/middleware/shopValidation.js` and `server/middleware/rateLimit.js`.
- Business logic in `server/lib/targeting.js` and `server/lib/timerValidation.js`.

This keeps route files relatively thin—they wire HTTP inputs to validation and business logic instead of containing everything inline.

---

**Q48. How is error handling implemented in the Express backend?**

**A:** The pattern is:

- Route handlers wrap logic in try/catch or use async handlers.
- Any thrown error is passed to an Express error‑handling middleware.
- The error handler logs details on the server, but returns a sanitized JSON error to the client in the format `{ "error": "Short message" }` with an appropriate HTTP status code (400/401/403/404/500).

The key point is that stack traces and internal details are not exposed in production.

---

**Q49. How do you deal with environment‑specific configuration in the server?**

**A:** Environment‑specific values like `MONGODB_URI`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, and `NODE_ENV` are read from environment variables (via `.env` in development). The `server/env.js` helper centralizes reading and validating those values. This allows different configs for local dev, staging, and production without changing the code.

---

## 14. MongoDB‑Specific Questions

**Q50. How do you ensure MongoDB queries are efficient for the storefront endpoint?**

**A:** I:

- Create indexes that match the query shape, like `{ shop: 1, endAt: 1 }` for fixed timers.
- Use `.lean()` when reading documents for read‑only operations to avoid the overhead of full Mongoose documents.
- Keep the response shape minimal—only the fields needed by the widget (type, endAt/durationSeconds, styling, urgency).

Combined with short‑lived caching, this keeps latency low.

---

**Q51. How do you handle ObjectId validation for timer IDs?**

**A:** For routes like `GET /api/timers/:id` and `PATCH /api/timers/:id`, I:

- Check that `:id` is a valid MongoDB ObjectId string before querying.
- If it’s invalid, immediately return a `400` error with an appropriate message.
- If it’s valid but no matching document is found for that `id` and `shop`, I return a `404`.

That prevents malformed IDs from causing unnecessary DB work or confusing errors.

---

## 15. React / Polaris‑Specific Questions

**Q52. How do you structure React components in the admin app?**

**A:** The admin app uses a page‑based structure aligned with file‑based routing from Shopify’s template. Each page component focuses on a single responsibility, like showing a list of timers or rendering a timer form. Reusable UI patterns—like status banners, loading spinners, or resource pickers—are broken out into smaller components and helpers in `admin-app/src/utils.js` and `admin-app/src/lib/status.js`. Data fetching is abstracted through hooks like `useFetch` so page components read almost like declarative descriptions of the UI state.

---

**Q53. How does Polaris help you maintain design consistency?**

**A:** Polaris provides ready‑made components that match Shopify’s design language—things like `Page`, `Card`, `DataTable`, `Form`, `TextField`, and `Banner`. By using these rather than custom styling, the app instantly feels familiar inside Shopify admin, and I avoid re‑solving UX patterns like spacing, typography, and accessibility. It also speeds up development because I can compose components rather than design from scratch.

---

**Q54. How do you manage loading and error states in the admin UI?**

**A:** I use a combination of:

- Hooks like `useFetch` or React Query to expose `isLoading`, `error`, and `data`.
- Polaris components like `Spinner`, `SkeletonPage`, and `Banner` to visually represent those states.
- A small status helper in `admin-app/src/lib/status.js` to consolidate logic for “idle/loading/success/error” so components don’t re‑implement the same checks.

This keeps the UI predictable and reduces duplicated code.

---

## 16. Debugging / Troubleshooting Questions

**Q55. How would you debug “countdown not showing on the product page”?**

**A:** I’d follow roughly the same steps documented in the README:

1. **App Proxy**: Check that the app is running (`npm run dev`) and the app proxy in `shopify.app.toml` points to the correct URL; verify there’s no 404 on `/apps/countdown/...`.
2. **Storefront vs preview**: Open the real product URL (not only theme preview) to avoid cross‑origin issues.
3. **Active timer**: Confirm there is an active timer that targets that product or “All products,” with a valid time window.
4. **Console/network**: Look at browser dev tools for the `/api/storefront/timer` call—status code and response.
5. **Theme block**: Ensure only one countdown block is added to the section and that the script is loading without errors.

Those checks usually narrow the issue down very quickly.

---

**Q56. If timers are not saving correctly in the admin, how would you debug it?**

**A:** I would:

- Check the browser network tab for the `POST /api/timers` or `PATCH /api/timers/:id` calls to see if they return 400/500 and inspect the JSON error.
- Confirm the payload matches the expected shape in `docs/API.md`.
- Add or inspect logs around `server/lib/timerValidation.js` to see if Zod is rejecting something unexpectedly.
- Verify Mongo connection status via logs and that the `Timer` model is imported correctly.

From there, I can adjust either the frontend payload or the backend schema/validation.

---

## 17. Behavioral / Collaboration Questions (Tied to This Project)

**Q57. How would you explain this project to a non‑technical stakeholder?**

**A:** I’d say: “This is a Shopify plugin that lets you add countdown timers for promotions to your product pages. You can turn a timer on or off, choose which products it applies to, and customize the look. The app also shows you how many times each timer was seen, so you can tell which promotions are getting attention.”

---

**Q58. How did you make sure this project would be maintainable for other developers?**

**A:** I focused on:

- Clear separation between routes, business logic, models, and middleware.
- Consistent error shapes and validation patterns.
- Documentation in `README.md`, `docs/API.md`, `docs/DEVELOPMENT-GUIDE.md`, and `docs/INTERVIEW-QA.md`.
- A logical file structure that mirrors features: `server/`, `admin-app/`, `widget/`, `theme-extension/`, `tests/`.

This makes it easier for someone else to navigate and extend the codebase.

---

**Q59. If a teammate wanted to add a new timer type (for example, a recurring weekly timer), how would you guide them?**

**A:** I’d suggest:

- Extending the `Timer` schema in `server/models/Timer.js` with a new `type` value and whatever extra fields are needed (e.g. days of week, time window).
- Updating Zod schemas in `server/lib/timerValidation.js` to validate the new fields.
- Extending the targeting logic in `server/lib/targeting.js` to compute whether the timer is active on a given day/time.
- Adding UI controls in the admin app’s timer form to configure the new type.
- Adding tests in `tests/` for the new logic.

That way the change is implemented consistently across backend, frontend, and tests.

---

## 18. Role‑Fit / Level‑Specific Questions

**Q60. For a junior role: What did you learn from building this project?**

**A:** I learned how to take a real‑world requirement—“add a countdown timer to product pages with basic analytics”—and break it down into a full stack solution. That included integrating with Shopify’s app model, designing a small but robust API, working with MongoDB and data modeling, and being conscious of performance on the storefront. I also got practice with structuring a codebase for maintainability and documenting it so that I can explain it clearly in an interview.

---

**Q61. For a mid‑level role: How does this project show your ability to design end‑to‑end systems?**

**A:** It shows that I can:

- Start from a product requirement and design appropriate data models and APIs.
- Make tech choices (Mongo vs SQL, Preact vs React, Theme App Extension vs ScriptTag) and justify them.
- Implement secure, multi‑tenant backend logic.
- Build an admin UI that’s pleasant to use and integrated with a platform’s design system.
- Consider performance and operational concerns from the beginning (caching, bundle size, rate limiting, monitoring).

All of those pieces come together into a coherent, production‑ready app.