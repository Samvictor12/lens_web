import { toast } from "sonner";

export const PAYMENT_METHODS = [
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "CHECK",
];

export const PAYMENT_METHOD_LABELS = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  CHECK: "Cheque",
  // legacy aliases still shown if old rows exist
  CHEQUE: "Cheque",
  NEFT: "NEFT",
  RTGS: "RTGS",
};

export const emptyPaymentForm = {
  vendorId: "",
  bankLedgerId: "",
  paymentDate: new Date().toISOString().split("T")[0],
  paymentMethod: "BANK_TRANSFER",
  referenceNumber: "",
  vendorInvoiceNo: "",
  notes: "",
  subtotalAmount: "",
  taxAmount: "",
  totalAmount: "",
  items: [],
};

function round2(n) {
  return Math.round(parseFloat(n || 0) * 100) / 100;
}

function sortVendorInvoices(invoices) {
  return [...invoices].sort((a, b) => {
    const dateA = a.invoiceDate ? new Date(a.invoiceDate).getTime() : Infinity;
    const dateB = b.invoiceDate ? new Date(b.invoiceDate).getTime() : Infinity;
    if (dateA !== dateB) return dateA - dateB;
    return String(a.invoiceNumber || "").localeCompare(String(b.invoiceNumber || ""));
  });
}

/** Client-side FIFO preview for vendor invoice payment allocation */
export function previewAllocations(invoices, totalAmount, overrides = {}) {
  const sorted = sortVendorInvoices(invoices);
  const total = round2(totalAmount);
  let remaining = total;
  const result = {};

  const overrideIds = new Set(Object.keys(overrides).map((k) => parseInt(k, 10)));

  for (const inv of sorted) {
    if (overrideIds.has(inv.id)) {
      const amt = round2(overrides[inv.id]);
      const max = round2(inv.outstanding);
      result[inv.id] = Math.min(amt, max, remaining);
      remaining = round2(remaining - result[inv.id]);
    }
  }

  for (const inv of sorted) {
    if (overrideIds.has(inv.id)) continue;
    if (remaining <= 0) {
      result[inv.id] = 0;
      continue;
    }
    const max = round2(inv.outstanding);
    const amt = round2(Math.min(remaining, max));
    result[inv.id] = amt;
    remaining = round2(remaining - amt);
  }

  return { allocations: result, remaining: round2(remaining) };
}

// ─── printVendorPaymentVoucher ─────────────────────────────────────────────────
export function printVendorPaymentVoucher(payment) {
  if (!payment) return;

  const itemRows = (payment.items || [])
    .map(
      (i) => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${
          i.purchaseOrder?.poNumber || `PO #${i.purchaseOrderId}`
        }</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${i.notes || "—"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">
          ₹${parseFloat(i.allocatedAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Payment Voucher ${payment.voucherNumber}</title>
    <style>
      @page{size:A4;margin:20mm}
      body{font-family:Arial,sans-serif;font-size:13px;color:#111;margin:0}
      h1{font-size:22px;margin:0 0 4px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
      .lbl{color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
      .val{font-weight:600;font-size:14px}
      .sec{font-size:13px;font-weight:700;margin:20px 0 8px;border-bottom:2px solid #e5e7eb;padding-bottom:4px}
      table{width:100%;border-collapse:collapse}
      th{text-align:left;padding:7px 8px;background:#f3f4f6;font-size:12px;color:#374151}
      @media print{button{display:none}}
    </style>
  </head><body>
    <div class="header">
      <div>
        <h1>PAYMENT VOUCHER</h1>
        <div style="font-size:18px;font-weight:700;color:#4f46e5;">${payment.voucherNumber}</div>
      </div>
      <div style="text-align:right">
        <div class="lbl">Payment Date</div>
        <div class="val">${new Date(payment.paymentDate).toLocaleDateString("en-IN")}</div>
      </div>
    </div>
    <div style="display:flex;gap:40px;margin-bottom:20px">
      <div>
        <div class="lbl">Paid To</div>
        <div class="val">${payment.vendor?.name || "—"}</div>
        ${payment.vendor?.code ? `<div style="color:#6b7280;font-size:12px">${payment.vendor.code}</div>` : ""}
      </div>
      ${
        payment.vendorInvoiceNo
          ? `<div><div class="lbl">Vendor Invoice</div><div class="val">${payment.vendorInvoiceNo}</div></div>`
          : ""
      }
      <div>
        <div class="lbl">Payment Method</div>
        <div class="val">${(payment.paymentMethod || "").replace(/_/g, " ")}</div>
      </div>
      <div>
        <div class="lbl">Reference No.</div>
        <div class="val">${payment.referenceNo || "—"}</div>
      </div>
    </div>
    <div class="sec">Total Amount</div>
    <div style="font-size:20px;font-weight:700;margin-bottom:10px;">
      ₹${parseFloat(payment.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
    </div>
    ${
      payment.subtotalAmount != null || payment.taxAmount != null
        ? `<div style="display:flex;gap:24px;margin-bottom:10px;font-size:12px">
            <div><span class="lbl">Subtotal</span><br/>₹${parseFloat(payment.subtotalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            <div><span class="lbl">GST</span><br/>₹${parseFloat(payment.taxAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
          </div>`
        : ""
    }
    ${
      payment.items?.length
        ? `<div class="sec">PO Allocations</div>
    <table>
      <thead><tr><th>PO Number</th><th>Notes</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>`
        : ""
    }
    ${
      payment.notes
        ? `<div style="margin-top:20px;padding:10px;background:#f9fafb;border-radius:6px;font-size:12px"><strong>Narration:</strong> ${payment.notes}</div>`
        : ""
    }
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) {
    toast.error("Please allow popups to print");
    return;
  }
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 300);
}
