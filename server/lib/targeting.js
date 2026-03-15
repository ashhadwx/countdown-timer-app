/**
 * Returns whether the timer applies to the given product/collection context.
 * @param {{ targetType: string, productIds?: string[], collectionIds?: string[] }} timer - Timer targeting config
 * @param {{ productId?: string, collectionIds?: string[] }} context - Current page context
 * @returns {boolean}
 */
export function timerMatchesTargeting(timer, context) {
  if (!timer) return false;
  if (timer.targetType === "all") return true;
  if (timer.targetType === "products" && timer.productIds?.length) {
    const productId = (context.productId || "").trim();
    return productId ? timer.productIds.includes(productId) : false;
  }
  if (timer.targetType === "collections" && timer.collectionIds?.length) {
    const collectionIds = Array.isArray(context.collectionIds) ? context.collectionIds : [];
    return collectionIds.some((id) => timer.collectionIds.includes(id));
  }
  return false;
}
