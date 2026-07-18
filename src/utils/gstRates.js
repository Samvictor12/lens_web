export const DEFAULT_GST_RATES = [
  { label: "GST 0%", value: 0 },
  { label: "GST 5%", value: 5 },
  { label: "GST 12%", value: 12 },
  { label: "GST 18%", value: 18 },
  { label: "GST 28%", value: 28 },
];

/**
 * Parse GST rate options from CompanySettings.customAttributes
 */
export function getGstRatesFromSettings(company) {
  const raw = company?.customAttributes?.gstRates;
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_GST_RATES;
  }
  const rates = raw
    .map((r) => ({
      label: String(r.label ?? `${r.value}%`),
      value: parseFloat(r.value),
    }))
    .filter((r) => !Number.isNaN(r.value));
  return rates.length > 0 ? rates : DEFAULT_GST_RATES;
}

export function gstRatesToSelectOptions(rates) {
  return rates.map((r) => ({
    id: String(r.value),
    name: r.label,
    value: r.value,
  }));
}

function parsePercent(value) {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Invoice billing GST / SGST % from company Tax details (customAttributes).
 */
export function getInvoiceTaxRatesFromCompany(company) {
  const attrs =
    company?.customAttributes && typeof company.customAttributes === "object"
      ? company.customAttributes
      : {};
  return {
    gstPercent: parsePercent(attrs.gstPercent ?? attrs.invoiceGstPercent ?? 0),
    sgstPercent: parsePercent(attrs.sgstPercent ?? attrs.invoiceSgstPercent ?? 0),
  };
}

/**
 * Split taxable amount into GST + SGST and net total.
 */
export function calcInvoiceTaxBreakdown(taxableAmount, gstPercent, sgstPercent) {
  const taxable = Math.round((Number(taxableAmount) || 0) * 100) / 100;
  const gstP = parsePercent(gstPercent);
  const sgstP = parsePercent(sgstPercent);
  const gstAmount = Math.round(taxable * (gstP / 100) * 100) / 100;
  const sgstAmount = Math.round(taxable * (sgstP / 100) * 100) / 100;
  const taxAmount = Math.round((gstAmount + sgstAmount) * 100) / 100;
  const totalAmount = Math.round((taxable + taxAmount) * 100) / 100;
  return {
    taxableAmount: taxable,
    gstPercent: gstP,
    sgstPercent: sgstP,
    gstAmount,
    sgstAmount,
    taxAmount,
    totalAmount,
  };
}
