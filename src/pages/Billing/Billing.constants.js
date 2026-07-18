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

function escapeHtml(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

/** Multi-line goods description lines (plain text). */
function goodsDescriptionLines(o) {
  const product = o.lensProduct || {};
  const name = product.lens_name || "Lens";
  const coating = o.coating?.name || "";

  const r = formatEyeSpecs("right", o);
  const l = formatEyeSpecs("left", o);
  const eyes = [r ? `[R] ${r}` : null, l ? `[L] ${l}` : null].filter(Boolean);

  return [name, coating, eyes.join(" ")].filter(Boolean);
}

/** HTML goods description for tax invoice. */
export function formatGoodsDescription(o) {
  return goodsDescriptionLines(o).map(escapeHtml).join("<br/>");
}

function formatGoodsDescriptionPlain(o) {
  return goodsDescriptionLines(o).join(" · ");
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
  return {
    pan: customer?.pan || "",
    stateCode: customer?.stateCode || customer?.state_code || "",
  };
}

export function getCustomerPhone(invoice) {
  const customer = invoice?.customer || {};
  return customer.phone || customer.alternatephone || "";
}

/** Same pattern as Customer Portal — wa.me with 91 prefix. */
export function openWhatsApp(phone, message) {
  if (!phone) {
    toast.error("No customer phone number available");
    return false;
  }
  const cleaned = String(phone).replace(/\D/g, "");
  if (!cleaned) {
    toast.error("No customer phone number available");
    return false;
  }
  const number = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
  window.open(
    `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer"
  );
  return true;
}

function buildInvoiceMessageText(invoice) {
  const remaining = (invoice.totalAmount || 0) - (invoice.paidAmount || 0);
  const orderNos = invoice.saleOrders?.map((o) => o.orderNo).join(", ") || "—";
  const products = (invoice.saleOrders || [])
    .map((o) => formatGoodsDescriptionPlain(o))
    .filter(Boolean)
    .slice(0, 5);
  const productLines =
    products.length > 0
      ? products.map((p, i) => `${i + 1}. ${p}`).join("\n")
      : "—";

  return [
    `*Invoice: ${invoice.invoiceNo}*`,
    `Customer: ${invoice.customer?.name || "—"}`,
    `Amount: ${fmt(invoice.totalAmount)}`,
    `Paid: ${fmt(invoice.paidAmount)}`,
    ...(remaining > 0.01 ? [`*Outstanding: ${fmt(remaining)}*`] : []),
    `Due Date: ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}`,
    `Orders: ${orderNos}`,
    `Status: ${STATUS_CONFIG[invoice.status]?.label || invoice.status}`,
    "",
    "*Products:*",
    productLines,
  ].join("\n");
}

function buildInvoicePdfNote(invoice) {
  const remaining = (invoice.totalAmount || 0) - (invoice.paidAmount || 0);
  return [
    `Invoice *${invoice.invoiceNo}*`,
    `Amount: ${fmt(invoice.totalAmount)}`,
    ...(remaining > 0.01 ? [`Outstanding: ${fmt(remaining)}`] : []),
    `Due Date: ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}`,
    "",
    "Invoice PDF ready; please find attached.",
  ].join("\n");
}

// ─── buildInvoiceHtml — modern GST Tax Invoice ────────────────────────────────
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

  const companyName = escapeHtml(company.companyName || company.name || "—");
  const sellerAddress = escapeHtml(
    [company.address, company.city, company.state, company.pincode].filter(Boolean).join(", ")
  );
  const buyerAddress = escapeHtml(
    [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(", ")
  );

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

  let goodsSubtotal = 0;
  const commTotal = communicationExpenses(orders);

  const orderRows = orders
    .map((o, idx) => {
      const discAmt = lineDiscountAmount(o);
      const taxable = lineTaxable(o);
      const qty = lineQtyPairs(o);
      const rate = lineRatePerPair(o);
      goodsSubtotal += taxable;
      const hsn = dash(o.hsnCode || o.hsn || o.lensProduct?.hsnCode);

      return `<tr>
        <td class="c">${idx + 1}</td>
        <td>${escapeHtml(dash(o.orderNo))}</td>
        <td>${escapeHtml(dash(o.customerRefNo))}</td>
        <td class="desc">${formatGoodsDescription(o)}</td>
        <td class="c">${qty}</td>
        <td class="r">${rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td class="r">${taxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
        <td class="c">${escapeHtml(hsn)}</td>
        <td class="r">${discAmt > 0 ? discAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}</td>
      </tr>`;
    })
    .join("");

  const netTotal = Number(invoice.totalAmount) || goodsSubtotal;
  const roundOff = Math.round((netTotal - Math.floor(netTotal + 1e-9)) * 100) / 100;
  const fittingShown = Math.round(fittingChargesTotal(orders) * 100) / 100;
  const commShown = Math.round(commTotal * 100) / 100;

  const logoHtml = company.logo
    ? `<img class="logo" src="${escapeHtml(company.logo)}" alt=""/>`
    : "";

  // Single A4 tax invoice (no Original/Duplicate/Triplicate stack)
  const sheetHtml = `
    <div class="sheet">
      <div class="sheet-body">
        <header class="header">
          <div class="brand">
            ${logoHtml}
            <div>
              <div class="company-name">${companyName}</div>
              ${company.tagline ? `<div class="tagline">${escapeHtml(company.tagline)}</div>` : ""}
              <div class="muted">${sellerAddress || "—"}</div>
              <div class="muted">
                ${company.phone ? `Ph: ${escapeHtml(company.phone)}` : ""}
                ${company.phone && company.email ? " · " : ""}
                ${company.email ? `Email: ${escapeHtml(company.email)}` : ""}
              </div>
            </div>
          </div>
          <div class="inv-head">
            <div class="doc-title">TAX INVOICE</div>
            <div class="inv-meta">
              <div><span class="lbl">Invoice No</span><strong>${escapeHtml(dash(invoice.invoiceNo))}</strong></div>
              <div><span class="lbl">Date</span><strong>${invoiceDate}</strong></div>
              <div><span class="lbl">Due Date</span><strong>${dueDateStr}</strong></div>
            </div>
          </div>
        </header>

        <section class="parties">
          <div class="party">
            <div class="party-label">Seller (Bill From)</div>
            <div class="party-name">${companyName}</div>
            <div>GSTIN: <strong>${escapeHtml(dash(company.gstin))}</strong></div>
            <div>PAN: ${escapeHtml(dash(sellerAttrs.pan))}</div>
            <div>State: ${escapeHtml(dash(company.state))} &nbsp; Code: ${escapeHtml(dash(sellerAttrs.stateCode))}</div>
          </div>
          <div class="party">
            <div class="party-label">Buyer (Bill To)</div>
            <div class="party-name">${escapeHtml(dash(customer.shopname || customer.name))}</div>
            ${customer.shopname && customer.name ? `<div>${escapeHtml(customer.name)}</div>` : ""}
            <div>${buyerAddress || "—"}</div>
            ${customer.phone ? `<div>Ph: ${escapeHtml(customer.phone)}</div>` : ""}
            <div>GSTIN: <strong>${escapeHtml(dash(customer.gstin))}</strong></div>
            <div>State: ${escapeHtml(dash(customer.state))} &nbsp; Code: ${escapeHtml(dash(buyerAttrs.stateCode))}</div>
          </div>
        </section>

        <div class="ship-row">
          <div><span class="lbl">Courier</span> ${escapeHtml(courier)}</div>
          <div><span class="lbl">Destination</span> ${escapeHtml(destination)}</div>
        </div>

        <table class="lines">
          <thead>
            <tr>
              <th style="width:24px">#</th>
              <th style="width:82px">SO No</th>
              <th style="width:68px">Ref No</th>
              <th>Description of Goods</th>
              <th style="width:40px">Qty</th>
              <th style="width:68px">Rate</th>
              <th style="width:76px">Taxable</th>
              <th style="width:52px">HSN</th>
              <th style="width:64px">Discount</th>
            </tr>
          </thead>
          <tbody>
            ${orderRows || `<tr><td colspan="9" class="c muted">No sale orders</td></tr>`}
          </tbody>
        </table>

        <div class="totals-grid">
          <div class="charges">
            <div class="charge-row"><span>Communication Expenses</span><span>₹${commShown.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
            <div class="charge-row"><span>Fitting Charges</span><span>₹${fittingShown.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
            <div class="words"><strong>Amount in words:</strong> ${escapeHtml(amountInWords(netTotal))}</div>
          </div>
          <div class="totals">
            <div class="t-row"><span>Subtotal</span><span>₹${netTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
            <div class="t-row"><span>Round Off</span><span>${roundOff ? roundOff.toFixed(2) : "—"}</span></div>
            <div class="t-row net"><span>Net Total</span><span>₹${netTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></div>
          </div>
        </div>

        <div class="bank-strip">
          <div><span class="lbl">Bank</span> ${escapeHtml(dash(sellerAttrs.bankName))}</div>
          <div><span class="lbl">A/C No</span> ${escapeHtml(dash(sellerAttrs.bankAccountNo))}</div>
          <div><span class="lbl">IFSC</span> ${escapeHtml(dash(sellerAttrs.ifsc))}</div>
          <div><span class="lbl">E-Ref</span> ${escapeHtml(dash(sellerAttrs.electronicRefNo))}</div>
        </div>

        <div class="decl">
          We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
          GST charged (if any) is as per applicable rates under the GST Act.
        </div>

        <footer class="footer">
          <div class="footer-meta">
            <div>Print: ${printNow}</div>
          </div>
          <div class="sign">
            <div class="sign-line">For ${companyName}</div>
            <div class="sign-box"></div>
            <div class="sign-caption">Authorised Signatory</div>
          </div>
        </footer>
      </div>
    </div>`;

  // A4 sheet geometry is identical for preview iframe and print:
  // each .sheet = 210mm × 297mm with 12mm inner padding (content area ~186×273mm).
  // @page margin:0 so print does not double-margin vs preview.
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Tax Invoice ${escapeHtml(dash(invoice.invoiceNo))}</title>
    <style>
      @page{size:A4 portrait;margin:0}
      *{box-sizing:border-box}
      html,body{margin:0;padding:0}
      html{height:100%}
      body{
        font-family:"Segoe UI",Helvetica,Arial,sans-serif;
        font-size:10.5px;color:#1a1a1a;line-height:1.35;
        background:#e2e8f0;
        padding:16px 12px 24px;
        min-height:100%;
        overflow:auto;
        -webkit-print-color-adjust:exact;print-color-adjust:exact;
      }
      .sheet{
        width:210mm;height:297mm;max-height:297mm;
        padding:12mm;
        margin:0 auto 16px;
        background:#fff;
        border:1px solid #cbd5e1;
        box-shadow:0 2px 8px rgba(15,23,42,.08);
        overflow:hidden;
        display:flex;flex-direction:column;
      }
      .sheet-body{flex:1;min-height:0;display:flex;flex-direction:column}
      .header{display:flex;justify-content:space-between;gap:14px;padding-bottom:10px;border-bottom:2px solid #0f172a;margin-bottom:10px;flex-shrink:0}
      .brand{display:flex;gap:10px;align-items:flex-start;flex:1;min-width:0}
      .logo{max-height:44px;max-width:88px;object-fit:contain}
      .company-name{font-size:15px;font-weight:700;letter-spacing:.02em;line-height:1.2}
      .tagline{font-size:9px;color:#64748b;margin-top:1px}
      .muted{color:#64748b;line-height:1.4;margin-top:1px;font-size:9.5px}
      .inv-head{text-align:right;flex-shrink:0}
      .doc-title{font-size:17px;font-weight:700;letter-spacing:.08em;color:#0f172a;margin-bottom:6px}
      .inv-meta{display:grid;gap:3px;font-size:10.5px}
      .inv-meta .lbl{display:inline-block;min-width:58px;color:#64748b;font-size:8px;text-transform:uppercase;letter-spacing:.04em}
      .lbl{color:#64748b;font-size:8px;text-transform:uppercase;letter-spacing:.04em;margin-right:5px}
      .parties{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;flex-shrink:0}
      .party{border:1px solid #e2e8f0;border-radius:4px;padding:8px 10px;min-height:78px;line-height:1.4}
      .party-label{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:3px}
      .party-name{font-weight:700;font-size:11px;margin-bottom:3px}
      .ship-row{display:flex;gap:20px;padding:6px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;margin-bottom:8px;flex-shrink:0}
      .ship-row > div{flex:1}
      table.lines{width:100%;border-collapse:collapse;margin-bottom:8px}
      table.lines th{
        background:#0f172a;color:#fff;font-size:8px;text-transform:uppercase;
        letter-spacing:.04em;font-weight:600;padding:5px 4px;text-align:left;border:none;
      }
      table.lines td{padding:5px 4px;border-bottom:1px solid #e2e8f0;vertical-align:top}
      table.lines tbody tr:nth-child(even) td{background:#f8fafc}
      table.lines td.desc{font-size:9.5px;line-height:1.35}
      .c{text-align:center}
      .r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
      .totals-grid{display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;flex-shrink:0}
      .charges{flex:1;display:flex;flex-direction:column;gap:4px}
      .charge-row{display:flex;justify-content:space-between;max-width:260px;padding:3px 0;border-bottom:1px dashed #e2e8f0}
      .words{margin-top:6px;padding:6px 8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;line-height:1.35;font-size:10px}
      .totals{width:200px;border:1px solid #cbd5e1;border-radius:4px;overflow:hidden;flex-shrink:0}
      .t-row{display:flex;justify-content:space-between;padding:5px 8px;border-bottom:1px solid #e2e8f0}
      .t-row.net{font-weight:700;font-size:12px;background:#0f172a;color:#fff;border-bottom:none}
      .bank-strip{
        display:grid;grid-template-columns:repeat(4,1fr);gap:6px;
        padding:8px 10px;border:1px solid #e2e8f0;border-radius:4px;margin-bottom:8px;background:#f8fafc;flex-shrink:0;
      }
      .decl{font-size:8.5px;color:#475569;line-height:1.4;margin-bottom:8px;flex-shrink:0}
      .footer{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-top:auto;padding-top:6px;flex-shrink:0}
      .footer-meta{font-size:8px;color:#64748b;line-height:1.4}
      .sign{width:180px;text-align:center}
      .sign-line{font-size:9px;margin-bottom:3px}
      .sign-box{border-bottom:1px solid #0f172a;height:42px;margin-bottom:3px}
      .sign-caption{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
      @media print{
        html,body{height:auto;overflow:visible}
        body{background:#fff;padding:0}
        .sheet{
          margin:0;border:none;box-shadow:none;
          width:210mm;height:297mm;max-height:297mm;
        }
      }
    </style>
  </head><body>
    ${sheetHtml}
  </body></html>`;
}

// ─── printInvoice ─────────────────────────────────────────────────────────────
export function printInvoice(invoice, company) {
  if (!invoice) return;
  const html = buildInvoiceHtml(invoice, company);

  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) {
    toast.error("Please allow popups to print");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  // Let A4 sheet layout settle, then open system print (choose A4 / Save as PDF)
  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch (_) {
      /* ignore */
    }
  };
  if (win.document.fonts?.ready) {
    win.document.fonts.ready.then(() => setTimeout(triggerPrint, 150));
  } else {
    setTimeout(triggerPrint, 350);
  }
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

/** WhatsApp text summary (no print). */
export function whatsappShareInvoiceMessage(invoice) {
  const phone = getCustomerPhone(invoice);
  openWhatsApp(phone, buildInvoiceMessageText(invoice));
}

/** Print/PDF first, then WhatsApp short note for manual PDF attach. */
export function whatsappShareInvoicePdf(invoice, company) {
  const phone = getCustomerPhone(invoice);
  if (!phone) {
    toast.error("No customer phone number available");
    return;
  }
  printInvoice(invoice, company);
  setTimeout(() => {
    openWhatsApp(phone, buildInvoicePdfNote(invoice));
  }, 500);
}

/** @deprecated Prefer whatsappShareInvoiceMessage */
export function whatsappShare(invoice) {
  whatsappShareInvoiceMessage(invoice);
}
