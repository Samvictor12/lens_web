// Print-friendly HTML for Customer/Vendor Credit & Debit Notes (M4/M5).
// Mirrors the browser-print pattern used by src/pages/Billing/Billing.constants.js (buildInvoiceHtml/printInvoice).

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

/**
 * @param {object} note - CreditNote/DebitNote/VendorCreditNote/VendorDebitNote row
 * @param {'credit'|'debit'} kind
 * @param {object} company - CompanySettings row (optional)
 * @param {'customer'|'vendor'} partyType
 */
export function buildCreditDebitNoteHtml(note, kind, company = {}, partyType = "customer") {
  const isCredit = kind === "credit";
  const label = isCredit ? "Credit Note" : "Debit Note";
  const party = partyType === "vendor" ? note.vendor : note.customer;
  const partyLabel = partyType === "vendor" ? "Vendor" : "Customer";
  const invoiceRef = partyType === "vendor" ? note.vendorInvoice?.invoiceNumber : note.invoice?.invoiceNo;
  const net = parseFloat(note.amount || 0) - parseFloat(note.taxAmount || 0);

  const companyName = escapeHtml(company.companyName || company.name || "—");
  const companyAddress = escapeHtml([company.address, company.city, company.state, company.pincode].filter(Boolean).join(", "));
  const companyGstin = escapeHtml(company.gstin || "");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(note.noteNumber)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 16px; }
  .title { font-size: 20px; font-weight: bold; margin: 0; }
  .company-name { font-size: 16px; font-weight: bold; margin: 0 0 4px; }
  .muted { color: #555; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; font-size: 12px; }
  th { background: #f1f1f1; }
  .text-right { text-align: right; }
  .totals { margin-top: 14px; width: 260px; margin-left: auto; }
  .totals td { border: none; padding: 3px 0; }
  .totals .grand { font-weight: bold; border-top: 1px solid #111; }
  .reason { margin-top: 14px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <p class="company-name">${companyName}</p>
      <p class="muted">${companyAddress}</p>
      ${companyGstin ? `<p class="muted">GSTIN: ${companyGstin}</p>` : ""}
    </div>
    <div style="text-align:right">
      <p class="title">${label}</p>
      <p class="muted">${escapeHtml(note.noteNumber)}</p>
      <p class="muted">Date: ${new Date(note.noteDate).toLocaleDateString("en-IN")}</p>
    </div>
  </div>

  <p><strong>${partyLabel}:</strong> ${escapeHtml(party?.name || party?.shopname || "—")} ${party?.code ? `(${escapeHtml(party.code)})` : ""}</p>
  ${invoiceRef ? `<p><strong>Reference Invoice:</strong> ${escapeHtml(invoiceRef)}</p>` : ""}

  <table>
    <thead>
      <tr><th>Description</th><th class="text-right">Amount</th></tr>
    </thead>
    <tbody>
      <tr><td>${isCredit ? "Amount adjusted (net)" : "Amount charged (net)"}</td><td class="text-right">${fmt(net)}</td></tr>
      <tr><td>GST</td><td class="text-right">${fmt(note.taxAmount)}</td></tr>
    </tbody>
  </table>

  <table class="totals">
    <tr class="grand"><td>Total ${label} Amount</td><td class="text-right">${fmt(note.amount)}</td></tr>
  </table>

  ${note.reason ? `<div class="reason"><strong>Reason:</strong> ${escapeHtml(note.reason)}</div>` : ""}
</body>
</html>`;
}

export function printCreditDebitNote(note, kind, company, partyType = "customer") {
  if (!note) return;
  const html = buildCreditDebitNoteHtml(note, kind, company, partyType);
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
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
