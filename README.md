# Countdown Timer + Analytics Shopify App

## Overview

A Shopify app that allows merchants to create countdown timers for promotions and display them on product pages.

## Tech Stack

- **Node.js** + **Express** — backend API
- **MongoDB** — timer configs and analytics
- **React** + **Shopify Polaris** — admin UI
- **Preact** — lightweight storefront widget
- **Theme App Extensions** — countdown block for themes

## Architecture

| Layer        | Stack / Description                                      |
| ------------ | -------------------------------------------------------- |
| Admin App    | React + Polaris (embedded in Shopify admin)              |
| Backend      | Node + Express API                                       |
| Database     | MongoDB                                                  |
| Widget       | Lightweight Preact bundle (&lt;30 KB gzipped)            |

The widget loads timer configuration via an optimized storefront API endpoint.

## Features

- **Fixed timers** — start/end date and time
- **Evergreen timers** — rolling countdown from first view
- **Product/collection targeting** — show timer on specific products or collections
- **Timer styling** — colors, size, position
- **Basic analytics** — impression counts per timer

## API Endpoints

- **Admin (session required):** `GET /api/timers`, `GET /api/timers/:id`, `POST /api/timers`, `PATCH /api/timers/:id`, `DELETE /api/timers/:id`
- **Storefront (widget):** `GET /api/storefront/timer` (one active timer per context), `POST /api/storefront/impression`

Full request/response details: [docs/API.md](docs/API.md).

## Performance

- Timer API responses use **cache headers** (`Cache-Control: public, max-age=60`)
- **Lightweight widget** bundle (Preact, &lt;30 KB gzipped)
- **No layout shifts** — widget reserves space and only mounts when a valid timer is returned

## Setup (quick)

1. **Clone** the repo and install dependencies: `npm install`
2. **Create `.env`** (copy from `.env.example`):

   ```env
   SHOPIFY_API_KEY=
   SHOPIFY_API_SECRET=
   MONGODB_URI=
   ```

3. **Link app:** `npm run shopify app config link`
4. **Build admin:** `npm run build:frontend`
5. **Run dev server:** `npm run dev` (or `shopify app dev`)

See [Setup](#setup) below for prerequisites and full steps.

## Tests

Unit tests go in `tests/` (see [tests/README.md](tests/README.md)). Add a test script to `package.json` (e.g. Vitest or Jest) and run `npm test`.

## Assumptions

- **One active timer per product** (or section) returned by the storefront API.
- **Analytics** counts impressions only (one per page load when the widget is visible).

---

## Project structure

```
countdown-timer-app/
├── admin-app/              # React + Polaris admin UI (embedded in Shopify admin)
├── widget/                 # Preact storefront countdown widget
├── server/                 # Node Express backend (API, auth, serves admin-app build)
├── theme-extension/        # Shopify Theme App Extension (countdown block)
├── tests/                  # Unit tests (add your tests here)
├── docs/                   # API and other docs
├── README.md
├── .env.example
├── package.json
└── eslint.config.js
```

## Benefits

Shopify apps are built on a variety of Shopify tools to create a great merchant experience. The [create an app](https://shopify.dev/docs/apps/getting-started/create) tutorial in our developer documentation will guide you through creating a Shopify app using this template.

The Node app template comes with the following out-of-the-box functionality:

- OAuth: Installing the app and granting permissions
- GraphQL Admin API: Querying or mutating Shopify admin data
- REST Admin API: Resource classes to interact with the API
- Shopify-specific tooling:
  - AppBridge
  - Polaris
  - Webhooks

## Tech Stack

This template combines a number of third party open-source tools:

- [Express](https://expressjs.com/) builds the backend.
- [Vite](https://vitejs.dev/) builds the [React](https://reactjs.org/) frontend.
- [React Router](https://reactrouter.com/) is used for routing. We wrap this with file-based routing.
- [React Query](https://react-query.tanstack.com/) queries the Admin API.
- [`i18next`](https://www.i18next.com/) and related libraries are used to internationalize the frontend.
  - [`react-i18next`](https://react.i18next.com/) is used for React-specific i18n functionality.
  - [`i18next-resources-to-backend`](https://github.com/i18next/i18next-resources-to-backend) is used to dynamically load app translations.
  - [`@formatjs/intl-localematcher`](https://formatjs.io/docs/polyfills/intl-localematcher/) is used to match the user locale with supported app locales.
  - [`@formatjs/intl-locale`](https://formatjs.io/docs/polyfills/intl-locale) is used as a polyfill for [`Intl.Locale`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale) if necessary.
  - [`@formatjs/intl-pluralrules`](https://formatjs.io/docs/polyfills/intl-pluralrules) is used as a polyfill for [`Intl.PluralRules`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules) if necessary.

The following Shopify tools complement these third-party tools to ease app development:

- [Shopify API library](https://github.com/Shopify/shopify-node-api) adds OAuth to the Express backend. This lets users install the app and grant scope permissions.
- [App Bridge React](https://shopify.dev/docs/apps/tools/app-bridge/getting-started/using-react) adds [authentication to API requests](https://shopify.dev/docs/api/app-bridge-library/apis/resource-fetching) in the frontend and renders components outside of the App’s iFrame.
- [Polaris React](https://polaris.shopify.com/) is a powerful design system and component library that helps developers build high quality, consistent experiences for Shopify merchants.
- [File-based routing](https://github.com/Shopify/shopify-frontend-template-react/blob/main/Routes.jsx) makes creating new pages easier.
- [`@shopify/i18next-shopify`](https://github.com/Shopify/i18next-shopify) is a plugin for [`i18next`](https://www.i18next.com/) that allows translation files to follow the same JSON schema used by Shopify [app extensions](https://shopify.dev/docs/apps/checkout/best-practices/localizing-ui-extensions#how-it-works) and [themes](https://shopify.dev/docs/themes/architecture/locales/storefront-locale-files#usage).

## Countdown Timer admin frontend

The admin UI is a React + Polaris app in `admin-app/`. Build it before running the app:

```bash
npm run build:frontend
```

Then run `npm run dev`; the backend serves the built files from `admin-app/dist/`. The backend injects `SHOPIFY_API_KEY` into the served `index.html`.

## Data architecture (Countdown Timer)

- **Multi-tenant isolation:** All timer and analytics data is scoped by `shop` (store domain). Every query filters by `shop`; indexes start with `shop` (e.g. `{ shop: 1, createdAt: -1 }`).
- **Analytics:** Impression count is stored on each timer document (embedded `impressionCount`), incremented atomically with `$inc` when the storefront widget displays the timer. The admin dashboard lists impressions per timer; the edit modal shows an **Analytics** section with total impressions (read-only).
- **MongoDB:** Used for timer configs and analytics; connection in `server/lib/db.js`, models in `server/models/`. Connect on startup, disconnect on SIGTERM/SIGINT.

## API and rate limiting

- **API reference:** See [docs/API.md](docs/API.md) for all endpoints, request/response shapes, auth, and status codes.
- **Storefront timer:** `GET /api/storefront/timer?shop=...&productId=...` returns one active timer config for the widget; response is cacheable with `Cache-Control: public, max-age=60` (60 seconds).
- **Rate limiting:** A placeholder middleware (`server/middleware/rateLimit.js`) runs on admin and storefront API routes. Intended production limits: **admin** — 100 req/min per shop; **storefront** — 60 req/min per shop (or per IP). Replace the placeholder with an in-memory or Redis-based limiter for production.

## Theme App Extension & Storefront Widget

- **Extension:** `theme-extension/countdown-timer/` — Theme app extension with a single block **Countdown Timer**. Merchants add the block to a product section in the theme editor; the widget loads only on product pages.
- **Widget:** Preact app in `widget/`. One API call per page load to `GET /api/storefront/timer`; respects server `Cache-Control`. No timer / expired / network error: widget does not render (no CLS). Fixed and evergreen countdown with optional urgency pulse; impression sent once after 1s visible via `POST /api/storefront/impression`. **Urgency:** When "Color pulse" is set, a subtle pulse animation runs when remaining time is below the configured threshold (default **last 5 minutes**; optional **last 60 seconds**). Set "None" to disable.
- **Build widget:** From repo root run `npm run build:widget`. Output is written to `theme-extension/countdown-timer/assets/countdown-widget.js`. Run `npm run build:widget:check` to enforce gzip size ≤30 KB (current ~7 KB gzipped).
- **App Proxy:** For the storefront to call your app API, configure an [App Proxy](https://shopify.dev/docs/apps/online-store/app-proxies) (e.g. subpath `/apps/countdown` → your app URL). The block setting “App API root” can override the default (same-origin `/apps/countdown`).

#### Troubleshooting: Countdown not showing

If the countdown block is on the product page but nothing appears (or you see "Countdown will appear here when you have an active timer…"):

1. **App Proxy** — The app’s `shopify.app.toml` includes `[app_proxy]` (prefix `apps`, subpath `countdown`). When you run **`npm run dev`** (or `shopify app dev`), the CLI updates the proxy URL to your tunnel so the storefront can reach your app. If you still get **404 on the live store**, ensure: (a) the app is **running** (`npm run dev`) so the tunnel is up, (b) the app is **installed** on the store you’re testing (e.g. ash-countdown-dev), and (c) you’ve **reinstalled** the app once after adding `write_app_proxy` scope so the store has proxy permissions.
2. **Theme preview vs live store** — The countdown widget uses same-origin requests. In the **theme customizer preview** (URL contains `shopifypreview.com`), the request is cross-origin to the store and can hit CORS/302; **open your storefront in a new tab** (e.g. `https://your-store.myshopify.com/products/...`) to test the countdown with same-origin requests.
3. **App running** — While testing, run `npm run dev` so the proxy target is reachable.
4. **Active timer** — In the Countdown Timer app, create a timer that is **active** (e.g. fixed with start in the past and end in the future, or evergreen) and set **Apply to** to **All products** (or include the product you are viewing). If no timer matches, the API returns 204 and the widget correctly shows nothing.
5. **One block only** — Ensure the Countdown Timer block is added only once per section; duplicate blocks can cause confusion.

### Development with storefront password (skip preview)

If your dev store uses password protection (e.g. password **reofas**) and you want to keep it on:

1. Run **`npm run dev`** from the app root. The backend, proxy, GraphiQL, and theme extension bundle will start. You will see **"Failed to start dev preview"** at the end — that is expected; ignore it.
2. Open your app from the **Partners dashboard** (e.g. **Test your app** or the app URL). The admin UI and API work normally.
3. To test the countdown on the storefront: in your dev store go to **Online Store → Themes → Customize**. Add the **Countdown Timer** app block to a product section, save, then open a product page on the storefront. Enter the storefront password (e.g. reofas) in the browser when prompted. The widget will load and work as usual.

No local preview URL (http://127.0.0.1:9293) is needed; you test the extension on the live storefront.

### If "Failed to start dev preview" appears (other causes)

When running `npm run dev`, the theme app extension preview can sometimes fail while the rest of the app starts correctly. If you are **not** using a storefront password, try these:

1. **Use the app without preview:** Open your app from the Partners dashboard. Add the Countdown Timer block in the theme editor and test on the storefront (see "Development with storefront password" above for steps).
2. **Get the real error:** Run `npm run dev -- --verbose` and look for the first error or stack trace after "Preparing dev preview".
3. **Update CLI:** Run `npm update @shopify/cli` (or update the root `@shopify/cli` / `@shopify/app` in package.json) and try again.
4. **Store theme:** Ensure your dev store has a theme that supports app blocks (e.g. Dawn).
5. **To use the local preview:** If you need the preview URL, turn off storefront password in dev store admin → **Online Store → Preferences** → "Password protection" off.

## Quality, security & performance

- **Lint:** Run `npm run lint` from the app root to lint backend (`server/`), admin app (`admin-app/`), and widget (`widget/`). Uses ESLint flat config (`eslint.config.js`) with `eslint:recommended`. Up to 30 warnings are allowed (e.g. template placeholder vars in privacy/shopify; JSX component imports in admin-app/widget).
- **Security:** All admin API routes use session-based `req.shop` (no cross-shop data). Storefront and impression endpoints validate `shop` (e.g. `*.myshopify.com`); impression only increments when timer belongs to that shop. All string inputs are sanitized (angle brackets stripped) before storage. Secrets (API keys, MongoDB URI) live only in server env; they are not in admin or widget bundles.
- **Widget graceful degradation:** The widget entry is wrapped in try/catch; any uncaught error results in no render and an optional console.error. The theme extension loads the script with `defer` so failures do not block the page.

## Performance

- **Widget bundle:** Single IIFE, Preact, minimal deps; gzipped size kept ≤30 KB (current ~7 KB). Build with `npm run build:widget`; enforce with `npm run build:widget:check`.
- **Storefront timer API:** Target response time &lt;200 ms. Achieved via: MongoDB indexes on `shop` and `shop + endAt`, `.lean()` queries, and `Cache-Control: public, max-age=60` to reduce repeat requests.
- **No CLS:** The widget reserves space (min-height) and only mounts after a valid timer is fetched; it does not render on 204/error, so the page layout does not shift (Lighthouse CLS-friendly).

## Setup

### Prerequisites

- **Node.js** 18+ (LTS recommended). [Download](https://nodejs.org/en/download/).
- **Shopify CLI** 3.x. Install via `npm install -g @shopify/cli @shopify/app` or use the version in the project (`npm run shopify -- --version`).
- **MongoDB** — local instance or [MongoDB Atlas](https://www.mongodb.com/atlas). Required for timer and analytics data.
- **Shopify Partner account** and a **development store** ([create one](https://help.shopify.com/en/partners/dashboard/development-stores#create-a-development-store) from the Partners dashboard).

### Install and run

1. **Clone** the repo and from the app root run: `npm install`
2. **Environment variables** — Copy `.env.example` to `.env` and set:
   - **`MONGODB_URI`** (or **`DATABASE_URL`**) — MongoDB connection string (required). Example: `mongodb://localhost:27017/countdown-timer` or an Atlas URI.
   - **`SHOPIFY_API_KEY`** and **`SHOPIFY_API_SECRET`** — From your app in [Partners](https://partners.shopify.com) → App setup. Often injected by the CLI when you link; set in `.env` to override.
3. **Link the app:** `npm run shopify app config link` — select org, app, and development store.
4. **Build admin frontend:** `npm run build:frontend`
5. **Run locally:** `npm run dev` — open the URL in the console and **install the app** on your development store when prompted.
6. **Widget on storefront:** In the dev store go to **Online Store → Themes → Customize**, add the **Countdown Timer** app block to a product section. Configure [App Proxy](https://shopify.dev/docs/apps/online-store/app-proxies) in Partners (e.g. subpath prefix `apps`, subpath `countdown`, proxy URL = your app URL). If the countdown does not appear on the product page, see [Troubleshooting: Countdown not showing](#troubleshooting-countdown-not-showing) below.

### Lint

- **Lint:** `npm run lint` (ESLint over `server/`, `admin-app/`, and `widget/`).

## Architecture decisions

- **Stack:** Backend: Node (Express), MongoDB (Mongoose), React + Polaris for the admin UI, Preact for the storefront widget, Theme App Extension for the block. Session storage uses the template default (e.g. SQLite); timer and analytics data are in MongoDB.
- **Theme App Extension (not ScriptTag):** Merchants add the countdown via the theme editor (app block) without editing theme code. It supports modern themes and app blocks; ScriptTag is legacy and less flexible for placement.
- **Single storefront API call:** The widget makes one `GET /api/storefront/timer` per page load. Response is cached with `Cache-Control: public, max-age=60`. One active timer per product/section is returned based on targeting (all / products / collections).
- **Multi-tenant isolation:** All data is scoped by `shop`. Every admin and storefront/impression path validates shop; timers and impression counts are filtered by shop.
- **Embedded impression count:** Stored on each timer document (`impressionCount`), incremented with MongoDB `$inc`. No separate collection; sufficient for basic analytics.
- **Rate limiting:** Placeholder middleware in place; production should use in-memory or Redis (admin ~100 req/min per shop, storefront ~60 req/min). See `server/middleware/rateLimit.js`.

## Assumptions

- **Development store** used for testing. Storefront password is not supported by `shopify app dev` preview; see [Development with storefront password](#development-with-storefront-password-skip-preview).
- **Evergreen timer** end time is in `sessionStorage`; resets on new session (new tab or browser close).
- **Storefront API** is called with public params (`shop`, `productId`, `collectionIds`). In production, validate via App Proxy (Shopify signs the request) or HMAC.
- **Impression** counted once per page load per timer (widget fires once after 1s visible). No session-based deduplication.
- **Single active timer** per product/section returned by the API; multiple timers per product could be a future enhancement.
- **Scopes:** Admin needs `read_products` and `read_collections` for the picker; reinstall the app if scopes change.

## Repository

**Loom / demo:** Use [docs/LOOM-CHECKLIST.md](docs/LOOM-CHECKLIST.md) for a recording checklist and talking points. Submit the Loom link with the GitHub repo if required.

## Getting started (template)

### Requirements

1. You must [download and install Node.js](https://nodejs.org/en/download/) if you don't already have it.
1. You must [create a Shopify partner account](https://partners.shopify.com/signup) if you don’t have one.
1. You must create a store for testing if you don't have one, either a [development store](https://help.shopify.com/en/partners/dashboard/development-stores#create-a-development-store) or a [Shopify Plus sandbox store](https://help.shopify.com/en/partners/dashboard/managing-stores/plus-sandbox-store).

### Installing the template

This template can be installed using your preferred package manager:

Using yarn:

```shell
yarn create @shopify/app --template=node
```

Using npm:

```shell
npm init @shopify/app@latest -- --template=node
```

Using pnpm:

```shell
pnpm create @shopify/app@latest --template=node
```

This will clone the template and install the required dependencies.

#### Local Development

[The Shopify CLI](https://shopify.dev/docs/apps/tools/cli) connects to an app in your Partners dashboard. It provides environment variables, runs commands in parallel, and updates application URLs for easier development.

You can develop locally using your preferred package manager. Run one of the following commands from the root of your app.

Using yarn:

```shell
yarn dev
```

Using npm:

```shell
npm run dev
```

Using pnpm:

```shell
pnpm run dev
```

Open the URL generated in your console. Once you grant permission to the app, you can start development.

## Deployment

### Application Storage

This template uses [SQLite](https://www.sqlite.org/index.html) to store session data. The database is a file called `database.sqlite` which is automatically created in the root. This use of SQLite works in production if your app runs as a single instance.

The database that works best for you depends on the data your app needs and how it is queried. You can run your database of choice on a server yourself or host it with a SaaS company. Here’s a short list of databases providers that provide a free tier to get started:

| Database   | Type             | Hosters                                                                                                                                                                                                                               |
| ---------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MySQL      | SQL              | [Digital Ocean](https://www.digitalocean.com/try/managed-databases-mysql), [Planet Scale](https://planetscale.com/), [Amazon Aurora](https://aws.amazon.com/rds/aurora/), [Google Cloud SQL](https://cloud.google.com/sql/docs/mysql) |
| PostgreSQL | SQL              | [Digital Ocean](https://www.digitalocean.com/try/managed-databases-postgresql), [Amazon Aurora](https://aws.amazon.com/rds/aurora/), [Google Cloud SQL](https://cloud.google.com/sql/docs/postgres)                                   |
| Redis      | Key-value        | [Digital Ocean](https://www.digitalocean.com/try/managed-databases-redis), [Amazon MemoryDB](https://aws.amazon.com/memorydb/)                                                                                                        |
| MongoDB    | NoSQL / Document | [Digital Ocean](https://www.digitalocean.com/try/managed-databases-mongodb), [MongoDB Atlas](https://www.mongodb.com/atlas/database)                                                                                                  |

To use one of these, you need to change your session storage configuration. To help, here’s a list of [SessionStorage adapter packages](https://github.com/Shopify/shopify-api-js/blob/main/packages/shopify-api/docs/guides/session-storage.md).

### Build

The frontend is a single page app. It requires the `SHOPIFY_API_KEY`, which you can find on the page for your app in your partners dashboard. Paste your app’s key in the command for the package manager of your choice:

Using yarn:

```shell
cd admin-app/ && SHOPIFY_API_KEY=REPLACE_ME yarn build
```

Using npm:

```shell
cd admin-app/ && SHOPIFY_API_KEY=REPLACE_ME npm run build
```

Using pnpm:

```shell
cd admin-app/ && SHOPIFY_API_KEY=REPLACE_ME pnpm run build
```

You do not need to build the backend.

## Hosting

When you're ready to set up your app in production, you can follow [our deployment documentation](https://shopify.dev/docs/apps/deployment/web) to host your app on a cloud provider like [Heroku](https://www.heroku.com/) or [Fly.io](https://fly.io/).

When you reach the step for [setting up environment variables](https://shopify.dev/docs/apps/deployment/web#set-env-vars), you also need to set the variable `NODE_ENV=production`.

## Known issues

### Hot module replacement and Firefox

When running the app with the CLI in development mode on Firefox, you might see your app constantly reloading when you access it.
That happened in previous versions of the CLI, because of the way HMR websocket requests work.

We fixed this issue with v3.4.0 of the CLI, so after updating it, you can make the following changes to your app's `admin-app/vite.config.js` file:

1. Change the definition `hmrConfig` object to be:

   ```js
   const host = process.env.HOST
     ? process.env.HOST.replace(/https?:\/\//, "")
     : "localhost";

   let hmrConfig;
   if (host === "localhost") {
     hmrConfig = {
       protocol: "ws",
       host: "localhost",
       port: 64999,
       clientPort: 64999,
     };
   } else {
     hmrConfig = {
       protocol: "wss",
       host: host,
       port: process.env.FRONTEND_PORT,
       clientPort: 443,
     };
   }
   ```

1. Change the `server.host` setting in the configs to `"localhost"`:

   ```js
   server: {
     host: "localhost",
     ...
   ```

### I can't get past the ngrok "Visit site" page

When you’re previewing your app or extension, you might see an ngrok interstitial page with a warning:

```text
You are about to visit <id>.ngrok.io: Visit Site
```

If you click the `Visit Site` button, but continue to see this page, then you should run dev using an alternate tunnel URL that you run using tunneling software.
We've validated that [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/run-tunnel/trycloudflare/) works with this template.

To do that, you can [install the `cloudflared` CLI tool](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/), and run:

```shell
# Note that you can also use a different port
cloudflared tunnel --url http://localhost:3000
```

Out of the logs produced by cloudflare you will notice a https URL where the domain ends with `trycloudflare.com`. This is your tunnel URL. You need to copy this URL as you will need it in the next step.

```shell
2022-11-11T19:57:55Z INF Requesting new quick Tunnel on trycloudflare.com...
2022-11-11T19:57:58Z INF +--------------------------------------------------------------------------------------------+
2022-11-11T19:57:58Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
2022-11-11T19:57:58Z INF |  https://randomly-generated-hostname.trycloudflare.com                                     |
2022-11-11T19:57:58Z INF +--------------------------------------------------------------------------------------------+
```

Below you would replace `randomly-generated-hostname` with what you have copied from the terminal. In a different terminal window, navigate to your app's root and with the URL from above you would call:

```shell
# Using yarn
yarn dev --tunnel-url https://randomly-generated-hostname.trycloudflare.com:3000
# or using npm
npm run dev --tunnel-url https://randomly-generated-hostname.trycloudflare.com:3000
# or using pnpm
pnpm dev --tunnel-url https://randomly-generated-hostname.trycloudflare.com:3000
```

## Developer resources

- [Introduction to Shopify apps](https://shopify.dev/docs/apps/getting-started)
- [App authentication](https://shopify.dev/docs/apps/auth)
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli)
- [Shopify API Library documentation](https://github.com/Shopify/shopify-api-js#readme)
- [Getting started with internationalizing your app](https://shopify.dev/docs/apps/best-practices/internationalization/getting-started)
  - [i18next](https://www.i18next.com/)
    - [Configuration options](https://www.i18next.com/overview/configuration-options)
  - [react-i18next](https://react.i18next.com/)
    - [`useTranslation` hook](https://react.i18next.com/latest/usetranslation-hook)
    - [`Trans` component usage with components array](https://react.i18next.com/latest/trans-component#alternative-usage-components-array)
  - [i18n-ally VS Code extension](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally)
