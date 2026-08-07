/**
 * Format Customer Ref with optional MRD for invoice / display.
 * Separator "/" only when MRD has a non-empty value.
 *
 * @param {string|null|undefined} customerRefNo
 * @param {string|null|undefined} mrdRefNo
 * @returns {string}
 */
export function formatCustomerRefMrd(customerRefNo, mrdRefNo) {
  const cust = customerRefNo?.trim?.() ? customerRefNo.trim() : "";
  const mrd = mrdRefNo?.trim?.() ? mrdRefNo.trim() : "";
  if (!cust && !mrd) return "";
  if (!mrd) return cust;
  if (!cust) return mrd;
  return `${cust} / ${mrd}`;
}

/**
 * Labelled invoice line, e.g. "Customer Ref : CUST-1023 / MRD-5562"
 * Returns empty string when customer ref is missing.
 */
export function formatCustomerRefMrdLabel(customerRefNo, mrdRefNo) {
  const value = formatCustomerRefMrd(customerRefNo, mrdRefNo);
  if (!value) return "";
  return `Customer Ref : ${value}`;
}
