import { toast } from "sonner";

// ─── Formatters ───────────────────────────────────────────────────────────────
export const fmt = (n) =>
  typeof n === "number"
    ? `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
    : "—";

export const orderTotal = (o) => {
  const lensPrice = o.lensPrice || 0;
  const extras =
    (o.fittingPrice || 0) +
    (o.tintingPrice || 0) +
    (o.rightEyeExtra || 0) +
    (o.leftEyeExtra || 0);
  // Discount applies to lens price only — matches SaleOrderForm & invoiceService
  const disc = lensPrice * ((o.discount || 0) / 100);
  const additional = Array.isArray(o.additionalPrice)
    ? o.additionalPrice.reduce((s, x) => s + (x.amount || 0), 0)
    : 0;
  return Math.round((lensPrice - disc + extras + additional) * 100) / 100;
};

// ─── Constants ────────────────────────────────────────────────────────────────
export const STATUS_CONFIG = {
  DRAFT:          { label: "Draft",          color: "bg-gray-100 text-gray-700 border-gray-300" },
  ISSUED:         { label: "Issued",         color: "bg-blue-100 text-blue-700 border-blue-300" },
  PARTIALLY_PAID: { label: "Partially Paid", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  PAID:           { label: "Paid",           color: "bg-green-100 text-green-700 border-green-300" },
  CANCELLED:      { label: "Cancelled",      color: "bg-red-100 text-red-700 border-red-300" },
};

/** Invoices eligible for payment (Accounting Customer Payments deep-link). */
export const PAYABLE_INVOICE_STATUSES = ["ISSUED", "PARTIALLY_PAID"];

export function canRecordPayment(status) {
  return PAYABLE_INVOICE_STATUSES.includes(status);
}

export const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHECK"];
export const PAGE_SIZE = 20;

export const billingFilters = {
  status: "ALL",
  startDate: "",
  endDate: "",
};

// ─── Helpers for Tax Invoice ──────────────────────────────────────────────────
function dash(v) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function hasSpec(v) {
  return v !== null && v !== undefined && v !== "";
}

function formatEyeSpecs(prefix, order) {
  const fields = [
    ["SPH", `${prefix}Spherical`],
    ["CYL", `${prefix}Cylindrical`],
    ["AXIS", `${prefix}Axis`],
    ["ADD", `${prefix}Add`],
    ["DIA", `${prefix}Dia`],
  ];
  const parts = fields
    .map(([label, key]) => (hasSpec(order?.[key]) ? `${label}:${order[key]}` : null))
    .filter(Boolean);
  return parts.length ? parts.join(" ") : "";
}

function formatGoodsDescription(o) {
  const name = o.lensProduct?.lens_name || "Lens";
  const coating = o.coating?.name ? ` / ${o.coating.name}` : "";
  const category = o.category?.name ? ` (${o.category.name})` : "";
  const r = formatEyeSpecs("right", o);
  const l = formatEyeSpecs("left", o);
  const eyes = [
    r ? `[R] ${r}` : null,
    l ? `[L] ${l}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return `${name}${coating}${category}${eyes ? ` ${eyes}` : ""}`;
}

function lineDiscountAmount(o) {
  const lensPrice = o.lensPrice || 0;
  return Math.round(lensPrice * ((o.discount || 0) / 100) * 100) / 100;
}

function lineTaxable(o) {
  return orderTotal(o);
}

function lineQtyPairs(o) {
  const r = o.rightEye ? 1 : 0;
  const l = o.leftEye ? 1 : 0;
  const eyes = r + l;
  return eyes > 0 ? eyes : 1;
}

function lineRatePerPair(o) {
  const qty = lineQtyPairs(o);
  const taxable = lineTaxable(o);
  return qty > 0 ? Math.round((taxable / qty) * 100) / 100 : taxable;
}

function communicationExpenses(orders) {
  return (orders || []).reduce((sum, o) => {
    if (!Array.isArray(o.additionalPrice)) return sum;
    return (
      sum +
      o.additionalPrice.reduce((a, x) => {
        const label = String(x?.label || x?.name || x?.description || "").toLowerCase();
        if (label.includes("communication") || label.includes("courier") || label.includes("shipping")) {
          return a + (x.amount || 0);
        }
        return a;
      }, 0)
    );
  }, 0);
}

function fittingChargesTotal(orders) {
  return (orders || []).reduce((sum, o) => sum + (o.fittingPrice || 0), 0);
}

/** Indian-style amount in words (rupees). */
export function amountInWords(amount) {
  const n = Math.round(Math.abs(Number(amount) || 0));
  if (n === 0) return "Zero Rupees Only";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const twoDigits = (num) => {
    if (num < 20) return ones[num];
    return `${tens[Math.floor(num / 10)]}${num % 10 ? ` ${ones[num % 10]}` : ""}`.trim();
  };
  const threeDigits = (num) => {
    if (num < 100) return twoDigits(num);
    return `${ones[Math.floor(num / 100)]} Hundred${num % 100 ? ` ${twoDigits(num % 100)}` : ""}`.trim();
  };

  let remaining = n;
  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;
  const hundred = remaining;

  const parts = [];
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  return `${parts.join(" ")} Rupees Only`;
}

function readCompanyAttrs(company) {
  const attrs = company?.customAttributes && typeof company.customAttributes === "object"
    ? company.customAttributes
    : {};
  return {
    pan: attrs.pan || attrs.PAN || attrs.sellerPan || "",
    stateCode: attrs.stateCode || attrs.state_code || attrs.STATE_CODE || "",
    bankAccountNo: attrs.bankAccountNo || attrs.bankAcNo || attrs.bankAccount || attrs.bank_ac_no || "",
    bankName: attrs.bankName || attrs.bank_name || "",
    ifsc: attrs.ifsc || attrs.IFSC || "",
    electronicRefNo: attrs.electronicRefNo || attrs.electronicReferenceNo || attrs.electronic_ref_no || "",
  };
}

function readCustomerAttrs(customer) {
  // No first-class PAN/stateCode on Customer — leave blank unless future attrs appear
  return {
    pan: customer?.pan || "",
    stateCode: customer?.stateCode || customer?.state_code || "",
  };
}

// ─── buildInvoiceHtml — M.V.V Tax Invoice layout ──────────────────────────────
/**
 * @param {object} invoice - invoice payload (from getInvoiceById)
 * @param {object} [companyOverride] - optional company from useCompany(); falls back to invoice.company
 */
export function buildInvoiceHtml(invoice, companyOverride) {
  const company = companyOverride || invoice.company || {};
  const sellerAttrs = readCompanyAttrs(company);
  const customer = invoice.customer || {};
  const buyerAttrs = readCustomerAttrs(customer);
  const orders = invoice.saleOrders || [];

  const sellerAddress = [company.address, company.city, company.state, company.pincode]
    .filter(Boolean)
    .join(", ");
  const buyerAddress = [customer.address, customer.city, customer.state, customer.pincode]
    .filter(Boolean)
    .join(", ");

  const invoiceDate = invoice.createdAt
    ? new Date(invoice.createdAt).toLocaleDateString("en-IN")
    : "—";
  const dueDateStr = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString("en-IN")
    : "—";
  const printNow = new Date().toLocaleString("en-IN");

  const courier = dash(invoice.courier || invoice.notes?.match?.(/courier[:\s]+([^,\n]+)/i)?.[1]);
  const destination = dash(
    invoice.destination ||
      [customer.city, customer.state].filter(Boolean).join(", ") ||
      null
  );

  let fittingTotal = 0;
  let commTotal = communicationExpenses(orders);
  let goodsSubtotal = 0;

  const orderRows = orders
    .map((o, idx) => {
      const lensPrice = o.lensPrice || 0;
      const discAmt = lineDiscountAmount(o);
      const taxable = lineTaxable(o);
      const qty = lineQtyPairs(o);
      const rate = lineRatePerPair(o);
      fittingTotal += o.fittingPrice || 0;
      // Taxable in table already includes fitting; track goods portion for notes
      goodsSubtotal += taxable;
      const hsn = dash(o.hsnCode || o.hsn || o.lensProduct?.hsnCode);
      const dcNo = dash(o.dcNo || o.dispatchNo || o.itemRefNo);

      return `<tr>
        <td class="c">${idx + 1}</td>
        <td>${dash(o.orderNo)}</td>
        <td>${dash(o.customerRefNo)}</td>
        <td class="desc">${formatGoodsDescription(o)}</td>
        <td class="r">${rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td class="r">${taxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td class="c">${qty}</td>
        <td class="c">${hsn}</td>
        <td class="r">${discAmt > 0 ? discAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}</td>
        <td class="c">${dcNo}</td>
      </tr>`;
    })
    .join("");

  const netTotal = Number(invoice.totalAmount) || goodsSubtotal;
  const roundOff = Math.round((netTotal - Math.floor(netTotal + 1e-9)) * 100) / 100;
  // Prefer invoice total as authoritative; show fitting/comm from SO fields
  const fittingShown = Math.round(fittingChargesTotal(orders) * 100) / 100;
  const commShown = Math.round(commTotal * 100) / 100;
  const subTotal = Math.round((netTotal - (roundOff !== 0 && roundOff < 1 ? roundOff : 0)) * 100) / 100;

  const copies = ["ORIGINAL FOR BUYER", "DUPLICATE FOR TRANSPORT", "TRIPLICATE FOR ASSESSEE"];

  const copyBlocks = copies
    .map(
      (copyLabel, copyIdx) => `
    <div class="copy ${copyIdx < copies.length - 1 ? "page-break" : ""}">
      <div class="copy-banner">${copyLabel}</div>
      <div class="title-row">
        <div class="title">TAX INVOICE</div>
        <div class="inv-meta">
          <div><span class="lbl">Invoice No.</span> <strong>${dash(invoice.invoiceNo)}</strong></div>
          <div><span class="lbl">Date</span> <strong>${invoiceDate}</strong></div>
          <div><span class="lbl">Due Date</span> <strong>${dueDateStr}</strong></div>
        </div>
      </div>

      <div class="parties">
        <div class="party">
          <div class="party-h">Seller</div>
          <div class="party-name">${dash(company.companyName || company.name)}</div>
          <div>${dash(sellerAddress)}</div>
          ${company.phone ? `<div>Phone: ${company.phone}</div>` : ""}
          <div>STATE: ${dash(company.state)} &nbsp; STATE CODE: ${dash(sellerAttrs.stateCode)}</div>
          <div>GST NO: ${dash(company.gstin)} &nbsp; PAN: ${dash(sellerAttrs.pan)}</div>
        </div>
        <div class="party">
          <div class="party-h">Buyer</div>
          <div class="party-name">${dash(customer.name)}</div>
          ${customer.shopname ? `<div>${customer.shopname}</div>` : ""}
          <div>${dash(buyerAddress)}</div>
          ${customer.phone ? `<div>Phone: ${customer.phone}</div>` : ""}
          <div>STATE: ${dash(customer.state)} &nbsp; STATE CODE: ${dash(buyerAttrs.stateCode)}</div>
          <div>GST NO: ${dash(customer.gstin)} &nbsp; PAN: ${dash(buyerAttrs.pan)}</div>
        </div>
      </div>

      <div class="meta-row">
        <div><span class="lbl">Date</span> ${invoiceDate}</div>
        <div><span class="lbl">Courier</span> ${courier === "—" ? "—" : courier}</div>
        <div><span class="lbl">Destination</span> ${destination}</div>
      </div>

      <table class="lines">
        <thead>
          <tr>
            <th>SR</th>
            <th>Order No</th>
            <th>Ref No.</th>
            <th>Description Of Goods</th>
            <th>Rate Per Pair</th>
            <th>Taxable Amount</th>
            <th>Qty In Pairs</th>
            <th>HSN Code</th>
            <th>Discount Amount</th>
            <th>DC No.</th>
          </tr>
        </thead>
        <tbody>
          ${orderRows || `<tr><td colspan="10" class="c">No sale orders</td></tr>`}
        </tbody>
      </table>

      <div class="totals-wrap">
        <div class="notes-col">
          <div><span class="lbl">Communication Expenses</span> ₹${commShown.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          <div><span class="lbl">Fitting Charges</span> ₹${fittingShown.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="totals-col">
          <div class="t-row"><span>SubTotal</span><span>₹${(Number(invoice.totalAmount) || subTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
          <div class="t-row"><span>Round Off</span><span>${roundOff ? roundOff.toFixed(2) : "—"}</span></div>
          <div class="t-row net"><span>Net Total</span><span>₹${netTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
        </div>
      </div>

      <div class="words"><strong>Amount in words:</strong> ${amountInWords(netTotal)}</div>
      <div class="decl">
        We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
        GST charged (if any) is as per applicable rates under the GST Act.
      </div>

      <div class="footer">
        <div class="bank">
          <div><span class="lbl">Bank A/C No</span> ${dash(sellerAttrs.bankAccountNo)}</div>
          <div><span class="lbl">Bank Name</span> ${dash(sellerAttrs.bankName)}</div>
          <div><span class="lbl">IFSC</span> ${dash(sellerAttrs.ifsc)}</div>
          <div><span class="lbl">Electronic Reference No</span> ${dash(sellerAttrs.electronicRefNo)}</div>
        </div>
        <div class="sign">
          <div class="sign-box">Authorised Signatory</div>
          <div class="print-meta">Print Date &amp; Time: ${printNow}</div>
          <div class="print-meta">Page ${copyIdx + 1} of ${copies.length}</div>
        </div>
      </div>
    </div>`
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Tax Invoice ${dash(invoice.invoiceNo)}</title>
    <style>
      @page{size:A4;margin:10mm}
      *{box-sizing:border-box}
      body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;margin:0;padding:8px}
      .copy{border:1px solid #222;padding:10px 12px;margin-bottom:12px}
      .page-break{page-break-after:always}
      .copy-banner{text-align:center;font-size:10px;font-weight:700;letter-spacing:.06em;border-bottom:1px solid #222;padding-bottom:4px;margin-bottom:8px}
      .title-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
      .title{font-size:18px;font-weight:700;letter-spacing:.04em}
      .inv-meta{text-align:right;font-size:11px;line-height:1.5}
      .lbl{color:#444;font-size:10px;text-transform:uppercase;letter-spacing:.03em}
      .parties{display:flex;gap:12px;margin-bottom:8px}
      .party{flex:1;border:1px solid #ccc;padding:6px 8px;min-height:90px}
      .party-h{font-weight:700;font-size:10px;text-transform:uppercase;margin-bottom:2px;border-bottom:1px solid #ddd;padding-bottom:2px}
      .party-name{font-weight:700;font-size:12px;margin-bottom:2px}
      .meta-row{display:flex;gap:16px;border:1px solid #ccc;padding:5px 8px;margin-bottom:8px}
      .meta-row > div{flex:1}
      table.lines{width:100%;border-collapse:collapse;margin-bottom:8px}
      table.lines th,table.lines td{border:1px solid #333;padding:4px 5px;vertical-align:top}
      table.lines th{background:#f3f4f6;font-size:9px;text-transform:uppercase}
      table.lines td.desc{font-size:10px;min-width:140px}
      .c{text-align:center}
      .r{text-align:right;white-space:nowrap}
      .totals-wrap{display:flex;justify-content:space-between;gap:16px;margin-bottom:8px}
      .notes-col{flex:1;border:1px solid #ccc;padding:6px 8px;line-height:1.6}
      .totals-col{width:240px;border:1px solid #333}
      .t-row{display:flex;justify-content:space-between;padding:4px 8px;border-bottom:1px solid #ddd}
      .t-row.net{font-weight:700;font-size:12px;background:#f3f4f6;border-bottom:none}
      .words{margin:6px 0;padding:6px 8px;border:1px solid #ccc;font-size:11px}
      .decl{font-size:9px;color:#333;margin:6px 0;line-height:1.4}
      .footer{display:flex;justify-content:space-between;gap:16px;margin-top:10px}
      .bank{flex:1;border:1px solid #ccc;padding:6px 8px;line-height:1.6}
      .sign{width:220px;text-align:center}
      .sign-box{border:1px solid #333;height:70px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;font-size:10px;font-weight:700}
      .print-meta{font-size:9px;color:#555;margin-top:4px}
      @media print{body{padding:0}.copy{border-color:#000}}
    </style>
  </head><body>
    ${copyBlocks}
  </body></html>`;
}

// ─── printInvoice ─────────────────────────────────────────────────────────────
export function printInvoice(invoice, company) {
  if (!invoice) return;
  const html = buildInvoiceHtml(invoice, company);

  const win = window.open("", "_blank");
  if (!win) {
    toast.error("Please allow popups to print");
    return;
  }
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

// ─── Share helpers ────────────────────────────────────────────────────────────
export async function shareInvoice(invoice) {
  const remaining = invoice.totalAmount - invoice.paidAmount;
  const orderNos = invoice.saleOrders?.map((o) => o.orderNo).join(", ") || "—";
  const text = [
    `Invoice: ${invoice.invoiceNo}`,
    `Customer: ${invoice.customer?.name || "—"}`,
    `Amount: ${fmt(invoice.totalAmount)}`,
    `Paid: ${fmt(invoice.paidAmount)}`,
    ...(remaining > 0.01 ? [`Outstanding: ${fmt(remaining)}`] : []),
    `Due Date: ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}`,
    `Orders: ${orderNos}`,
    `Status: ${STATUS_CONFIG[invoice.status]?.label || invoice.status}`,
  ].join("\n");

  if (navigator.share) {
    try {
      await navigator.share({ title: `Invoice ${invoice.invoiceNo}`, text });
      return;
    } catch (_) {
      /* user cancelled */
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Invoice details copied to clipboard");
  } catch (_) {
    toast.error("Could not copy to clipboard");
  }
}

export function whatsappShare(invoice) {
  const remaining = invoice.totalAmount - invoice.paidAmount;
  const orderNos = invoice.saleOrders?.map((o) => o.orderNo).join(", ") || "—";
  const text = [
    `*Invoice: ${invoice.invoiceNo}*`,
    `Customer: ${invoice.customer?.name || "—"}`,
    `Amount: ${fmt(invoice.totalAmount)}`,
    `Paid: ${fmt(invoice.paidAmount)}`,
    ...(remaining > 0.01 ? [`*Outstanding: ${fmt(remaining)}*`] : []),
    `Due Date: ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}`,
    `Orders: ${orderNos}`,
  ].join("\n");

  const phone = invoice.customer?.phone?.replace(/\D/g, "") || "";
  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
