/**
 * Sidebar / home route priority for post-login redirect.
 * First key with Screen permission wins.
 */
export const SCREEN_HOME_ROUTES = [
  { key: "dashboard", path: "/dashboard" },
  { key: "sale_orders", path: "/sales/orders" },
  { key: "inventory", path: "/inventory/items" },
  { key: "purchase_orders", path: "/masters/purchase-orders" },
  { key: "dispatch", path: "/dispatch" },
  { key: "dispatch_window", path: "/dispatch/window" },
  { key: "fitting", path: "/fitting/operator" },
  { key: "pre_qc", path: "/pre-qc/operator" },
  { key: "post_qc", path: "/quality/operator" },
  { key: "billing", path: "/billing" },
  { key: "chart_of_accounts", path: "/accounts/ledgers" },
  { key: "expenses", path: "/accounts/expenses" },
  { key: "customer_payments", path: "/accounts/customer-payments" },
  { key: "vendor_payments", path: "/accounts/vendor-payments" },
  { key: "bank_reconciliation", path: "/accounts/bank-reconciliation" },
  { key: "financial_reports", path: "/accounts/reports" },
  { key: "reports", path: "/reports" },
  { key: "customers", path: "/sales/customers" },
  { key: "vendors", path: "/masters/vendors" },
  { key: "users", path: "/masters/users" },
];

export const NO_ACCESS_PATH = "/no-access";

/**
 * @param {(key: string) => boolean} hasScreen
 * @returns {string} path
 */
export function resolveHomePath(hasScreen) {
  for (const { key, path } of SCREEN_HOME_ROUTES) {
    if (hasScreen(key)) return path;
  }
  return NO_ACCESS_PATH;
}
