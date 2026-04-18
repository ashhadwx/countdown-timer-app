## Countdown Timer App – Test Plan (By Phase)

This test plan mirrors the implementation phases and can be used as a checklist when preparing for Shopify App Store submission.

---

## Phase 1 – Compliance, Webhooks, and Data Lifecycle

**Objectives**

- Verify that uninstalling the app removes all shop-specific data.
- Confirm basic support for data export/deletion flows.

**Test Cases**

1. **Uninstall data deletion (single shop)**
   - Precondition:
     - Dev store A has the app installed.
     - At least one timer and some analytics exist for `shopA`.
   - Steps:
     1. Uninstall the app from store A.
     2. Inspect Mongo collections that store timer and analytics data.
   - Expected:
     - All documents associated with `shopA` are deleted.
     - Data for any other shop remains intact.

2. **Uninstall with concurrent traffic**
   - Precondition:
     - There is active traffic (e.g. hitting `GET /api/storefront/timer`) while uninstalling.
   - Steps:
     1. Start a small script that repeatedly calls the storefront endpoint.
     2. Uninstall the app.
   - Expected:
     - App handles race conditions gracefully (no crashes).
     - Data deletion completes for the shop.

3. **Data export endpoint**
   - Steps:
     1. Call the authenticated data export endpoint as an admin (e.g. `GET /api/shop/data-export`).
   - Expected:
     - Response contains all timers and analytics scoped to the current shop.
     - No data from other shops is included.

4. **GDPR webhooks (if implemented)**
   - Steps:
     1. Simulate incoming GDPR/CCPA webhooks from Shopify (or via a test harness).
   - Expected:
     - Handlers accept and log the request.
     - If implemented, perform specified data export/deletion actions without errors.

---

## Phase 2 – Billing & Plans

**Objectives**

- Ensure billing flows work end to end.
- Confirm that plan-based limits are enforced correctly.

**Test Cases**

1. **Billing activation**
   - Steps:
     1. From the admin app, click “Upgrade” (Pro plan).
     2. Complete the Shopify billing confirmation on the dev store.
   - Expected:
     - User is redirected back to the app.
     - The shop is marked as Pro and has access to Pro features.

2. **Free plan limits**
   - Precondition:
     - Shop is on Free plan (no active Pro subscription).
   - Steps:
     1. Attempt to create multiple timers, beyond Free limit (e.g. more than 1 active timer).
   - Expected:
     - UI shows a message that the limit has been reached.
     - Backend rejects operations that would exceed plan limits (with clear error).

3. **Plan downgrade / uninstall**
   - Steps:
     1. Cancel the Pro subscription via Shopify or simulate cancellation.
     2. Re-open the app.
   - Expected:
     - Shop is treated as Free (or downgraded).
     - Pro-only features are no longer available.

---

## Phase 3 – Onboarding & Admin UX

**Objectives**

- Validate that first-time merchants can set up a working timer in a single session.
- Ensure presets and live preview behave correctly.

**Test Cases**

1. **First-run onboarding**
   - Precondition:
     - New dev store with a fresh install and no timers.
   - Steps:
     1. Install the app.
     2. Open the app from Shopify admin.
   - Expected:
     - Onboarding screen appears.
     - Following steps leads to a created, active timer without errors.

2. **Preset application**
   - Steps:
     1. Open “Create Timer”.
     2. Select each preset (Flash Sale, Last Chance, Evergreen).
   - Expected:
     - Fields (type, dates/duration, styling) update to the correct preset values.
     - Preset settings can be modified before saving.

3. **Live preview updates**
   - Steps:
     1. Open timer editor with preview visible.
     2. Change key settings: colors, size, text, type (fixed/evergreen).
   - Expected:
     - Preview updates in near real-time to reflect changes.
     - Invalid input shows validation errors; preview does not crash.

---

## Phase 4 – Analytics Enhancements

**Objectives**

- Confirm analytics data is collected and displayed accurately per timer and per shop.

**Test Cases**

1. **Impression tracking**
   - Steps:
     1. Ensure an active timer is configured for a product.
     2. Visit the product page several times (incognito windows or different browsers).
     3. Open the Analytics view in the admin app.
   - Expected:
     - Impressions increase according to visits (allowing for any deduping rules).
     - `lastImpressionAt` roughly matches the most recent visit.

2. **Analytics date ranges**
   - Steps:
     1. Use fixtures or manual visits over multiple days (or simulate timestamps in tests).
     2. Request stats for last 7 days and last 30 days.
   - Expected:
     - Counts and charts respect the selected range.

3. **Shop isolation**
   - Precondition:
     - Two dev stores installed (A and B) with their own timers and traffic.
   - Steps:
     1. Generate impressions on store A and store B separately.
     2. View Analytics in each store’s admin app.
   - Expected:
     - Each store only sees its own data.

---

## Phase 5 – Smart Targeting & Advanced Features

**Objectives**

- Ensure advanced targeting rules are respected on the storefront.

**Test Cases**

1. **Include/Exclude rules**
   - Steps:
     1. Create a timer targeting a specific product or collection with include rules.
     2. Visit:
        - Targeted product/collection page.
        - Non-targeted product/collection page.
   - Expected:
     - Timer shows only on targeted pages.

2. **Multiple overlapping timers (if supported)**
   - Steps:
     1. Create two timers with overlapping targeting rules for the same product.
   - Expected:
     - The system either:
       - Enforces “one active timer per product” (documented behavior), or
       - Applies a deterministic rule (e.g. highest priority, latest created).

---

## Phase 6 – Performance, Rate Limiting & Monitoring

**Objectives**

- Validate rate limits and confirm the app behaves well under load.

**Test Cases**

1. **Admin rate limiting**
   - Steps:
     1. Use a script or tool to hit admin API endpoints rapidly (e.g. >100 requests/min/shop).
   - Expected:
     - Requests beyond the limit receive 429 responses.
     - Reasonable error message is returned.

2. **Storefront rate limiting**
   - Steps:
     1. Hit the storefront timer endpoint in a tight loop from a script or load tool.
   - Expected:
     - Storefront continues to respond quickly up to the configured limit.
     - Past the limit, responses return 429 without crashing the app.

3. **Health endpoint**
   - Steps:
     1. Call `GET /health`.
   - Expected:
     - Returns success payload (e.g. `{ status: "ok", db: "connected" }`) when all is well.
     - If Mongo is disconnected, status correctly reflects degraded state.

---

## Phase 7 – Documentation, Privacy & App Listing Readiness

**Objectives**

- Make sure onboarding, docs, and listing are accurate and consistent.

**Test Cases**

1. **Fresh developer setup using README**
   - Steps:
     1. On a new machine/environment, follow `README` instructions from scratch.
   - Expected:
     - Developer can install dependencies, link the app, run it, and install it on a dev store without needing extra undocumented steps.

2. **Privacy and Terms accessibility**
   - Steps:
     1. From the admin UI, locate links to Privacy Policy and Terms.
     2. From the public app listing, locate the same links.
   - Expected:
     - All links work and point to the correct documents/URLs.

3. **Listing consistency**
   - Steps:
     1. Compare the Shopify App Store listing (features, pricing, screenshots) with the actual app behavior.
   - Expected:
     - No discrepancies in:
       - Available features.
       - Limits of Free/Pro plans.
       - Support channels and response times.

