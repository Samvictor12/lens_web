import { toast } from "sonner";
import { formatGoodsDescription } from "@/pages/Billing/Billing.constants";

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

function lineQty(o) {
  const r = o.rightEye ? 1 : 0;
  const l = o.leftEye ? 1 : 0;
  const eyes = r + l;
  return eyes > 0 ? eyes : 1;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Build A4 Dispatch Challan HTML (multi-SO DC).
 * Mirrors invoice preview pattern: iframe srcDoc + print popup.
 */
export function buildDispatchHtml(dispatch, companyOverride) {
  const company = companyOverride || dispatch?.company || {};
  const customer = dispatch?.customer || {};
  const orders = dispatch?.saleOrders || [];
  const deliveryPerson = dispatch?.deliveryPerson || {};

  const companyName = escapeHtml(company.companyName || company.name || "—");
  const sellerAddress = escapeHtml(
    [company.address, company.city, company.state, company.pincode].filter(Boolean).join(", ")
  );
  const buyerName = escapeHtml(customer.shopname || customer.name || "—");
  const buyerAddress = escapeHtml(
    [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(", ")
  );
  const buyerPhone = escapeHtml(dash(customer.phone));

  const expectedDate = formatDate(dispatch?.expectedDeliveryDate);
  const createdDate = formatDate(dispatch?.createdAt);
  const actualDate = dispatch?.actualDeliveryDate
    ? formatDate(dispatch.actualDeliveryDate)
    : null;
  const printNow = new Date().toLocaleString("en-IN");
  const statusLabel = escapeHtml(dash(dispatch?.status));

  const orderRows = orders
    .map((o, idx) => {
      const qty = lineQty(o);
      const refs = [o.customerRefNo, o.itemRefNo].filter(Boolean).join(" / ") || "—";
      return `<tr>
        <td class="c">${idx + 1}</td>
        <td>${escapeHtml(dash(o.orderNo))}</td>
        <td>${escapeHtml(refs)}</td>
        <td class="desc">${formatGoodsDescription(o)}</td>
        <td class="c">${qty}</td>
      </tr>`;
    })
    .join("");

  const logoHtml = company.logo
    ? `<img class="logo" src="${escapeHtml(company.logo)}" alt=""/>`
    : "";

  const deliveryMeta = [
    deliveryPerson.name ? `Agent: ${escapeHtml(deliveryPerson.name)}` : null,
    dispatch?.vehicleNumber ? `Vehicle: ${escapeHtml(dispatch.vehicleNumber)}` : null,
    dispatch?.driverContact || deliveryPerson.phonenumber
      ? `Contact: ${escapeHtml(dispatch?.driverContact || deliveryPerson.phonenumber)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

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
            <div class="doc-title">DISPATCH CHALLAN</div>
            <div class="inv-meta">
              <div><span class="lbl">DC No</span><strong>${escapeHtml(dash(dispatch?.dcNumber))}</strong></div>
              <div><span class="lbl">Created</span><strong>${createdDate}</strong></div>
              <div><span class="lbl">Expected</span><strong>${expectedDate}</strong></div>
              ${actualDate ? `<div><span class="lbl">Delivered</span><strong>${actualDate}</strong></div>` : ""}
              <div><span class="lbl">Status</span><strong>${statusLabel}</strong></div>
            </div>
          </div>
        </header>

        <section class="parties">
          <div class="party">
            <div class="party-title">Deliver To</div>
            <div class="party-name">${buyerName}</div>
            <div class="muted">${buyerAddress || "—"}</div>
            <div class="muted">Phone: ${buyerPhone}</div>
          </div>
          <div class="party">
            <div class="party-title">Dispatch Details</div>
            <div class="muted">Orders: <strong>${orders.length}</strong></div>
            ${deliveryMeta ? `<div class="muted">${deliveryMeta}</div>` : ""}
            ${dispatch?.deliveryNotes ? `<div class="muted">Notes: ${escapeHtml(dispatch.deliveryNotes)}</div>` : ""}
          </div>
        </section>

        <table class="items">
          <thead>
            <tr>
              <th class="c" style="width:6%">#</th>
              <th style="width:16%">Order No</th>
              <th style="width:16%">Ref</th>
              <th>Description</th>
              <th class="c" style="width:8%">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${orderRows || `<tr><td colspan="5" class="c muted">No sale orders on this dispatch</td></tr>`}
          </tbody>
        </table>

        <footer class="footer">
          <div class="sign-row">
            <div class="sign">
              <div class="sign-box"></div>
              <div class="sign-caption">Prepared By</div>
            </div>
            <div class="sign">
              <div class="sign-box"></div>
              <div class="sign-caption">Received By</div>
            </div>
          </div>
          <div class="print-meta">Printed ${escapeHtml(printNow)}</div>
        </footer>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="utf-8"/>
  <title>Dispatch Challan ${escapeHtml(dash(dispatch?.dcNumber))}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 11px;
      color: #0f172a;
      background: #cbd5e1;
      padding: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #94a3b8;
      box-shadow: 0 2px 8px rgba(15,23,42,.12);
    }
    .sheet-body { padding: 14mm 16mm; }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .brand { display: flex; gap: 10px; align-items: flex-start; max-width: 58%; }
    .logo { max-height: 48px; max-width: 72px; object-fit: contain; }
    .company-name { font-size: 16px; font-weight: 700; letter-spacing: .02em; }
    .tagline { font-size: 9px; color: #64748b; margin-top: 2px; }
    .muted { color: #475569; font-size: 10px; line-height: 1.35; margin-top: 2px; }
    .inv-head { text-align: right; min-width: 140px; }
    .doc-title {
      font-size: 15px; font-weight: 800; letter-spacing: .08em;
      color: #0f766e; margin-bottom: 6px;
    }
    .inv-meta { display: grid; gap: 3px; text-align: right; }
    .inv-meta .lbl {
      display: inline-block; min-width: 64px; text-align: left;
      font-size: 8px; text-transform: uppercase; letter-spacing: .04em;
      color: #64748b; margin-right: 6px;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }
    .party {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 8px 10px;
      background: #f8fafc;
    }
    .party-title {
      font-size: 8px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .06em; color: #64748b; margin-bottom: 4px;
    }
    .party-name { font-size: 13px; font-weight: 700; }
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    table.items th, table.items td {
      border: 1px solid #cbd5e1;
      padding: 6px 7px;
      vertical-align: top;
    }
    table.items th {
      background: #f1f5f9;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: .04em;
      text-align: left;
    }
    table.items td.desc { font-size: 10px; line-height: 1.35; }
    .c { text-align: center; }
    .r { text-align: right; }
    .footer { margin-top: 20px; }
    .sign-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 28px;
    }
    .sign-box {
      border-bottom: 1px solid #0f172a;
      height: 42px;
      margin-bottom: 3px;
    }
    .sign-caption {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .print-meta {
      margin-top: 14px;
      font-size: 8px;
      color: #94a3b8;
      text-align: right;
    }
    @media print {
      html, body { height: auto; overflow: visible; }
      body { background: #fff; padding: 0; }
      .sheet {
        margin: 0; border: none; box-shadow: none;
        width: 210mm; min-height: 297mm;
      }
    }
  </style>
</head><body>
  ${sheetHtml}
</body></html>`;
}

export function printDispatch(dispatch, company) {
  if (!dispatch) return;
  const html = buildDispatchHtml(dispatch, company);

  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) {
    toast.error("Please allow popups to print");
    return;
  }
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
