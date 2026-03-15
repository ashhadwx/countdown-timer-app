// @ts-check
import "./env.js"; // Load .env first (before any module that reads process.env)
import { join, dirname } from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";
import { connectMongo, disconnectMongo } from "./lib/db.js";
import { attachShopFromSession } from "./middleware/shopValidation.js";
import timersRouter from "./routes/timers.js";

/** Rate limit placeholder. In production, replace with in-memory or Redis limiter. */
function rateLimitPlaceholder(_scope = "api") {
  return (_req, _res, next) => next();
}
import storefrontRouter from "./routes/storefront.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

// Serve built React app from admin-app/dist (run `npm run build:frontend` from repo root first)
const STATIC_PATH = join(__dirname, "..", "admin-app", "dist");

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in admin-app/vite.config.js

app.use(express.json());

// Storefront API (no session; validate shop in route). Mounted at both paths for App Proxy compatibility.
app.use("/api/storefront", rateLimitPlaceholder("storefront"), storefrontRouter);
app.use("/apps/countdown/api/storefront", rateLimitPlaceholder("storefront"), storefrontRouter);

app.use("/api/*", shopify.validateAuthenticatedSession());

app.use("/api/*", rateLimitPlaceholder("admin"));
app.use("/api/timers", attachShopFromSession, timersRouter);
app.get("/api/shop/products", async (_req, res) => {
  try {
    const client = new shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });
    const response = await client.request(`
      query { products(first: 100) { edges { node { id title } } } }
    `);
    const errs = response?.errors;
    if (errs && Array.isArray(errs) && errs.length > 0) {
      console.error("Products GraphQL errors:", errs);
      return res.status(403).json({ error: "Missing permission or API error", details: errs });
    }
    const edges = response?.data?.products?.edges ?? [];
    const products = Array.isArray(edges) ? edges.map((e) => ({ id: e.node.id, title: e.node.title })) : [];
    res.json(products);
  } catch (err) {
    console.error("Products list error:", err);
    res.status(500).json({ error: "Failed to list products" });
  }
});

app.get("/api/shop/collections", async (_req, res) => {
  try {
    const client = new shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });
    const response = await client.request(`
      query { collections(first: 100) { edges { node { id title } } } }
    `);
    const errs = response?.errors;
    if (errs && Array.isArray(errs) && errs.length > 0) {
      console.error("Collections GraphQL errors:", errs);
      return res.status(403).json({ error: "Missing permission or API error", details: errs });
    }
    const edges = response?.data?.collections?.edges ?? [];
    const collections = Array.isArray(edges) ? edges.map((e) => ({ id: e.node.id, title: e.node.title })) : [];
    res.json(collections);
  } catch (err) {
    console.error("Collections list error:", err);
    res.status(500).json({ error: "Failed to list collections" });
  }
});

app.get("/api/products/count", async (_req, res) => {
  try {
    const client = new shopify.api.clients.Graphql({
      session: res.locals.shopify.session,
    });
    const countData = await client.request(`
      query shopifyProductCount {
        productsCount {
          count
        }
      }
    `);
    res.status(200).send({ count: countData.data.productsCount.count });
  } catch (err) {
    console.error("Products count error:", err);
    res.status(500).json({ error: "Failed to get products count" });
  }
});

app.post("/api/products", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

let server;

async function start() {
  try {
    await connectMongo();
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
  server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

function shutdown(signal) {
  return () => {
    console.log(`${signal} received, closing server and MongoDB`);
    server?.close(() => {
      disconnectMongo()
        .then(() => process.exit(0))
        .catch((err) => {
          console.error("MongoDB disconnect error:", err);
          process.exit(1);
        });
    });
  };
}

process.on("SIGTERM", shutdown("SIGTERM"));
process.on("SIGINT", shutdown("SIGINT"));

start();
