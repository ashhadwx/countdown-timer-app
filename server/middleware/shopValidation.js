/**
 * Shop ownership validation. Attaches shop to req for admin routes.
 * Rejects with 401 if no valid shop session.
 */
export function attachShopFromSession(req, res, next) {
  const session = res.locals?.shopify?.session;
  if (!session?.shop) {
    return res.status(401).json({ error: "Unauthorized", message: "No shop session" });
  }
  req.shop = session.shop;
  next();
}
