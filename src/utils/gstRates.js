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
