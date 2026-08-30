export const BILLING_AND_INVOICING_PATH = "/accounts/billing-and-invoicing";
export const RECORD_PAYMENT_PATH = "/accounts/billing-and-invoicing/record-payment";
export const VENDOR_PAYMENTS_PATH = "/accounts/vendor-payments";
export const VENDOR_RECORD_PAYMENT_PATH = "/accounts/vendor-payments/record-payment";
export const CUSTOMER_360_PATH = "/accounts/customer-360";

export const invoiceDetailPath = (invoiceId) =>
  `${BILLING_AND_INVOICING_PATH}?invoiceId=${invoiceId}&openDetail=1`;

export const purchaseOrderDetailPath = (poId) =>
  `/masters/purchase-orders/view/${poId}`;

/** Build Record Payment route with optional deep-link query params. */
export function recordPaymentPath({
  customerId,
  invoiceId,
  amount,
  invoiceIds,
} = {}) {
  const params = new URLSearchParams();
  if (customerId != null && customerId !== "") params.set("customerId", String(customerId));
  if (invoiceId != null && invoiceId !== "") params.set("invoiceId", String(invoiceId));
  if (amount != null && amount !== "") params.set("amount", String(amount));
  if (Array.isArray(invoiceIds) && invoiceIds.length) {
    params.set("invoiceIds", invoiceIds.join(","));
  }
  const qs = params.toString();
  return qs ? `${RECORD_PAYMENT_PATH}?${qs}` : RECORD_PAYMENT_PATH;
}

/** Build vendor Record Payment route with optional deep-link query params. */
export function vendorRecordPaymentPath({
  vendorId,
  invoiceId,
  amount,
  invoiceIds,
  allocation = "bills",
} = {}) {
  const params = new URLSearchParams();
  if (vendorId != null && vendorId !== "") params.set("vendorId", String(vendorId));
  if (invoiceId != null && invoiceId !== "") params.set("invoiceId", String(invoiceId));
  if (amount != null && amount !== "") params.set("amount", String(amount));
  if (Array.isArray(invoiceIds) && invoiceIds.length) {
    params.set("invoiceIds", invoiceIds.join(","));
  }
  if (allocation) params.set("allocation", allocation);
  const qs = params.toString();
  return qs ? `${VENDOR_RECORD_PAYMENT_PATH}?${qs}` : VENDOR_RECORD_PAYMENT_PATH;
}

/** Current calendar month as YYYY-MM-DD start/end. */
export function currentMonthRange(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  const iso = (d) => {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  };
  return { startDate: iso(start), endDate: iso(end) };
}
