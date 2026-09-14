export const GST_REGISTER_HEADERS = [
  'SlNo',
  'Bill No',
  'Date',
  'Customer Name',
  'GSTNo',
  'State Name',
  'Sales Ledger',
  'HSN',
  'Qty',
  'Unit',
  'TaxRate',
  'Nett',
  'CGST',
  'SGST',
  'IGST',
  'IGST-Tax',
  'R-OFF',
  'Total Amt',
  'Total (taxable)',
  'Postage',
];

const DEFAULT_HSN = '90015000';
const DEFAULT_UNIT = 'Pair';
const SALES_LEDGER = 'Sales Revenue';

function round2(n) {
  return Math.round((parseFloat(n) || 0) * 100) / 100;
}

export function normalizeState(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function isIntraState(companyState, customerState) {
  return normalizeState(companyState) === normalizeState(customerState);
}

/** Qty = rightEye + leftEye flags; 1 if neither eye is selected. */
export function saleOrderPairQty(saleOrder) {
  const right = saleOrder?.rightEye ? 1 : 0;
  const left = saleOrder?.leftEye ? 1 : 0;
  const sum = right + left;
  return sum > 0 ? sum : 1;
}

export function invoiceQty(saleOrders = []) {
  if (!saleOrders.length) return 1;
  return saleOrders.reduce((s, so) => s + saleOrderPairQty(so), 0);
}

export function defaultsFromCompanySettings(company) {
  const attrs =
    company?.customAttributes && typeof company.customAttributes === 'object'
      ? company.customAttributes
      : {};
  const hsn = attrs.hsn || attrs.defaultHsn || attrs.gstHsn || DEFAULT_HSN;
  const unit = attrs.unit || attrs.defaultUnit || attrs.gstUnit || DEFAULT_UNIT;
  const rates = Array.isArray(attrs.gstRates) ? attrs.gstRates : [];
  const positive = rates
    .map((r) => parseFloat(r?.value))
    .find((v) => Number.isFinite(v) && v > 0);
  const defaultTaxRate = Number.isFinite(positive) ? positive : 18;
  return {
    companyState: company?.state || '',
    hsn: String(hsn),
    unit: String(unit),
    defaultTaxRate,
  };
}

export function resolveTaxRate(taxable, taxAmount, defaultTaxRate = 18) {
  if (taxable > 0 && taxAmount > 0) {
    return round2((taxAmount / taxable) * 100);
  }
  return round2(defaultTaxRate);
}

export function formatRegisterDate(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}-${m}-${y}`;
}

export function deriveGstRegisterRow(invoice, ctx, slNo) {
  const totalAmount = parseFloat(invoice.totalAmount) || 0;
  const taxAmount = parseFloat(invoice.taxAmount) || 0;
  const taxable = round2(totalAmount - taxAmount);
  const intra = isIntraState(ctx.companyState, invoice.customer?.state);
  const half = round2(taxAmount / 2);
  const cgst = intra ? half : 0;
  const sgst = intra ? round2(taxAmount - half) : 0;
  const igst = intra ? 0 : round2(taxAmount);
  const dateValue = invoice.billDate || invoice.createdAt;

  return {
    slNo,
    billNo: invoice.invoiceNo || '',
    date: formatRegisterDate(dateValue),
    customerName: invoice.customer?.name || '',
    gstNo: invoice.customer?.gstin || '',
    stateName: invoice.customer?.state || '',
    salesLedger: SALES_LEDGER,
    hsn: ctx.hsn || DEFAULT_HSN,
    qty: invoiceQty(invoice.saleOrders),
    unit: ctx.unit || DEFAULT_UNIT,
    taxRate: resolveTaxRate(taxable, taxAmount, ctx.defaultTaxRate),
    nett: taxable,
    cgst,
    sgst,
    igst,
    igstTax: igst,
    rOff: 0,
    totalAmt: round2(totalAmount),
    totalTaxable: taxable,
    postage: 0,
    intraState: intra,
  };
}

export function gstRegisterRowToExcelArray(row) {
  return [
    row.slNo,
    row.billNo,
    row.date,
    row.customerName,
    row.gstNo,
    row.stateName,
    row.salesLedger,
    row.hsn,
    row.qty,
    row.unit,
    row.taxRate,
    row.nett,
    row.cgst,
    row.sgst,
    row.igst,
    row.igstTax,
    row.rOff,
    row.totalAmt,
    row.totalTaxable,
    row.postage,
  ];
}
