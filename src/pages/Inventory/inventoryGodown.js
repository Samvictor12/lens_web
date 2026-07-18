/** URL slug ↔ ProcurementType / GodownType enum values */

export const GODOWN_SLUGS = {
  stock: "STOCK",
  rx: "RX",
};

export function slugToGodownType(slug) {
  if (slug === "rx") return "RX";
  return "STOCK";
}

export function godownTypeToSlug(godownType) {
  return godownType === "RX" ? "rx" : "stock";
}

export function parseInventoryPath(pathname) {
  const parts = (pathname || "").split("/").filter(Boolean);
  // inventory / stock|rx / tab
  const slug = parts[1] === "rx" || parts[1] === "stock" ? parts[1] : "stock";
  const tabSegment = parts[1] === "rx" || parts[1] === "stock" ? parts[2] : parts[1];
  const tabMap = {
    dashboard: "dashboard",
    inward: "inward",
    "request-queue": "requestQueue",
    transactions: "transactions",
    stock: "stock",
    reports: "dashboard",
    items: "dashboard",
  };
  return {
    slug,
    godownType: slugToGodownType(slug),
    activeTab: tabMap[tabSegment] || "dashboard",
  };
}

export function inventoryTabPath(slug, tabKey) {
  const segment = {
    dashboard: "dashboard",
    inward: "inward",
    requestQueue: "request-queue",
    transactions: "transactions",
    stock: "stock",
  }[tabKey] || "dashboard";
  return `/inventory/${slug}/${segment}`;
}

/** New transaction page under a godown */
export function inventoryTransactionAddPath(slug) {
  return `/inventory/${slug || "stock"}/transactions/add`;
}

/** PO inward page under a godown */
export function inventoryInwardDetailPath(slug, poId, receiptId) {
  return `/inventory/${slug || "stock"}/inward/${poId}/${receiptId}`;
}

export function godownDisplayLabel(godownType) {
  return godownType === "RX" ? "Rx Godown" : "Stock Godown";
}
