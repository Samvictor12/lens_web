/**
 * Shared sale-order free-text search (list + operator queues + live tracking).
 * Keep backend OR clause and UI placeholder in sync.
 */

export const SALE_ORDER_SEARCH_PLACEHOLDER =
  "Search order no, customer, ref, patient ref, MRD…";

/**
 * Prisma OR conditions for sale order text search.
 * @param {string} search
 * @returns {object[]|null}
 */
export function buildSaleOrderTextSearchOr(search) {
  const q = String(search || "").trim();
  if (!q) return null;
  return [
    { orderNo: { contains: q, mode: "insensitive" } },
    { customerRefNo: { contains: q, mode: "insensitive" } },
    { itemRefNo: { contains: q, mode: "insensitive" } },
    { mrdRefNo: { contains: q, mode: "insensitive" } },
    { customer: { name: { contains: q, mode: "insensitive" } } },
    { customer: { code: { contains: q, mode: "insensitive" } } },
    { customer: { shopname: { contains: q, mode: "insensitive" } } },
  ];
}
