import { toast } from "sonner";

// ─── Formatters ───────────────────────────────────────────────────────────────
export const fmt = (n) =>
  typeof n === "number"
    ? `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
    : "—";

export const orderTotal = (o) => {
  const base =
    (o.lensPrice || 0) +
    (o.fittingPrice || 0) +
    (o.tintingPrice || 0) +
    (o.rightEyeExtra || 0) +
    (o.leftEyeExtra || 0);
  const disc = base * ((o.discount || 0) / 100);
  const extra = Array.isArray(o.additionalPrice)
    ? o.additionalPrice.reduce((s, x) => s + (x.amount || 0), 0)
    : 0;
  return Math.round((base - disc + extra) * 100) / 100;
};

// ─── Constants ────────────────────────────────────────────────────────────────
export const STATUS_CONFIG = {
  DRAFT:          { label: "Draft",          color: "bg-gray-100 text-gray-700 border-gray-300" },
  ISSUED:         { label: "Issued",         color: "bg-blue-100 text-blue-700 border-blue-300" },
  PARTIALLY_PAID: { label: "Partially Paid", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  PAID:           { label: "Paid",           color: "bg-green-100 text-green-700 border-green-300" },
  CANCELLED:      { label: "Cancelled",      color: "bg-red-100 text-red-700 border-red-300" },
};

export const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHECK"];
export const PAGE_SIZE = 20;

export const billingFilters = {
  status: "ALL",
  startDate: "",
  endDate: "",
};

// ─── printInvoice ─────────────────────────────────────────────────────────────
export function printInvoice(invoice) {
  if (!invoice) return;
  const remaining = invoice.totalAmount - invoice.paidAmount;
  const orderRows = (invoice.saleOrders || [])
    .map((o) => {
      const base =
        (o.lensPrice || 0) + (o.fittingPrice || 0) + (o.tintingPrice || 0) +
        (o.rightEyeExtra || 0) + (o.leftEyeExtra || 0);
      const disc = base * ((o.discount || 0) / 100);
      const extra = Array.isArray(o.additionalPrice)
        ? o.additionalPrice.reduce((s, x) => s + (x.amount || 0), 0)
        : 0;
      const total = Math.round((base - disc + extra) * 100) / 100;
      return `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${o.orderNo}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${o.lensProduct?.lens_name || "—"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${o.coating?.name || "—"}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">
          ₹${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </td>
      </tr>`;
    })
    .join("");

  const paymentRows = (invoice.payments || [])
    .map(
      (p) => `<tr>
      <td style="padding:5px 8px;">${new Date(p.createdAt).toLocaleDateString("en-IN")}</td>
      <td style="padding:5px 8px;">${p.method.replace(/_/g, " ")}</td>
      <td style="padding:5px 8px;">${p.referenceNo || "—"}</td>
      <td style="padding:5px 8px;text-align:right;color:#16a34a;">
        ₹${p.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
      </td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <title>Invoice ${invoice.invoiceNo}</title>
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
        <h1>INVOICE</h1>
        <div style="font-size:18px;font-weight:700;color:#4f46e5;">${invoice.invoiceNo}</div>
      </div>
      <div style="text-align:right">
        <div class="lbl">Status</div>
        <div class="val">${STATUS_CONFIG[invoice.status]?.label || invoice.status}</div>
        <div class="lbl" style="margin-top:8px">Due Date</div>
        <div class="val">${new Date(invoice.dueDate).toLocaleDateString("en-IN")}</div>
      </div>
    </div>
    <div style="display:flex;gap:40px;margin-bottom:20px">
      <div>
        <div class="lbl">Bill To</div>
        <div class="val">${invoice.customer?.name || "—"}</div>
        ${invoice.customer?.code ? `<div style="color:#6b7280;font-size:12px">${invoice.customer.code}</div>` : ""}
        ${invoice.customer?.phone ? `<div style="color:#6b7280;font-size:12px">${invoice.customer.phone}</div>` : ""}
      </div>
      <div>
        <div class="lbl">Invoice Date</div>
        <div class="val">${new Date(invoice.createdAt).toLocaleDateString("en-IN")}</div>
      </div>
    </div>
    <div class="sec">Sale Orders</div>
    <table>
      <thead><tr>
        <th>Order No.</th><th>Product</th><th>Coating</th>
        <th style="text-align:right">Amount</th>
      </tr></thead>
      <tbody>
        ${orderRows}
        <tr style="font-weight:700">
          <td colspan="3" style="padding:8px;border-top:2px solid #e5e7eb;text-align:right">Total</td>
          <td style="padding:8px;border-top:2px solid #e5e7eb;text-align:right">
            ₹${invoice.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </td>
        </tr>
        <tr style="color:#16a34a">
          <td colspan="3" style="padding:4px 8px;text-align:right">Paid</td>
          <td style="padding:4px 8px;text-align:right">
            ₹${invoice.paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </td>
        </tr>
        ${
          remaining > 0.01
            ? `<tr style="color:#ea580c;font-weight:700">
          <td colspan="3" style="padding:4px 8px;text-align:right">Outstanding</td>
          <td style="padding:4px 8px;text-align:right">
            ₹${remaining.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </td>
        </tr>`
            : ""
        }
      </tbody>
    </table>
    ${
      invoice.payments?.length
        ? `<div class="sec">Payment History</div>
    <table>
      <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${paymentRows}</tbody>
    </table>`
        : ""
    }
    ${
      invoice.notes
        ? `<div style="margin-top:20px;padding:10px;background:#f9fafb;border-radius:6px;font-size:12px"><strong>Notes:</strong> ${invoice.notes}</div>`
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
