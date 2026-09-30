import QRCode from "qrcode";
import { printHtmlDocument } from "@/utils/printHtmlDocument";
import {
  checkPrintServiceHealth,
  printRawToPrinter,
} from "@/services/printerConfig";
import { getPrintModeFromConfig, loadPrinterConfigMap } from "@/utils/jobCardPrint";

function dash(v) {
  if (v === null || v === undefined || String(v).trim() === "") return "-";
  return String(v).trim();
}

function fmtRx(v) {
  if (v === null || v === undefined || String(v).trim() === "") return "-";
  const n = parseFloat(v);
  return Number.isNaN(n) ? String(v).trim() : Number(n).toFixed(2);
}

function hasAddValue(v) {
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  return s !== "" && s !== "-";
}

/** Bifocal / Progressive — same rule as Sale Order form. */
export function categoryShowsAdd(categoryName) {
  const n = String(categoryName || "").toLowerCase();
  return n.includes("bifocal") || n.includes("progressive");
}

/** Card date: DD/MM/YYYY */
export function formatCustomerCardDate(d) {
  if (!d) return "-";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function resolveIndex(order) {
  return (
    order?.lensProduct?.index?.index_name ||
    order?.lensIndex ||
    order?.lensProduct?.index_name ||
    ""
  );
}

function resolveLensName(order) {
  return order?.lensProduct?.lens_name || order?.lensProductName || "";
}

/** "Lens name: Name [index]" or "Lens name: Name" or "Lens name: -" */
export function resolveLensLine(order) {
  const index = String(resolveIndex(order) || "").trim();
  const name = String(resolveLensName(order) || "").trim();
  if (name && index) return `Lens name: ${name} [${index}]`;
  if (name) return `Lens name: ${name}`;
  return "Lens name: -";
}

function resolveCoating(order) {
  return order?.coating?.name || order?.coatingName || order?.coating_name || "";
}

function resolveCategory(order) {
  return (
    order?.category?.name ||
    order?.lensProduct?.category?.name ||
    order?.categoryName ||
    ""
  );
}

function resolveCustomerName(order) {
  return (
    order?.customer?.name ||
    order?.customer_name ||
    order?.customerName ||
    ""
  );
}

/**
 * Normalized DC Customer Card payload (preview + Chrome + EXE).
 */
export function buildCustomerCardPayload(order) {
  const orderNo = order?.orderNo || order?.order_number || "";
  const rightEye = !!order?.rightEye;
  const leftEye = !!order?.leftEye;
  const categoryName = resolveCategory(order);

  const right = {
    sph: fmtRx(order?.rightSpherical),
    cyl: fmtRx(order?.rightCylindrical),
    axis: dash(order?.rightAxis),
    add: fmtRx(order?.rightAdd),
    fh: dash(order?.rightDia), // FH = Dia
  };
  const left = {
    sph: fmtRx(order?.leftSpherical),
    cyl: fmtRx(order?.leftCylindrical),
    axis: dash(order?.leftAxis),
    add: fmtRx(order?.leftAdd),
    fh: dash(order?.leftDia),
  };

  const anyAdd =
    (rightEye && hasAddValue(order?.rightAdd)) ||
    (leftEye && hasAddValue(order?.leftAdd));
  const showAdd = categoryShowsAdd(categoryName) && anyAdd;

  const eyes = [];
  if (rightEye) eyes.push({ eye: "R", ...right });
  if (leftEye) eyes.push({ eye: "L", ...left });

  const lensLine = resolveLensLine(order);

  return {
    orderNo,
    lensLine,
    /** @deprecated use lensLine — kept for older preview checks */
    productLine: lensLine,
    coating: dash(resolveCoating(order)),
    category: dash(categoryName),
    categoryName,
    customerName: dash(resolveCustomerName(order)),
    ptName: dash(order?.itemRefNo),
    customerRefNo: dash(order?.customerRefNo),
    orderDate: formatCustomerCardDate(order?.orderDate),
    showAdd,
    rightEye,
    leftEye,
    eyes,
    right,
    left,
  };
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * One card HTML body (inner). qrDataUrl optional.
 * Print is upright in software; user loads stock upside down in Evolis (see rotate-print CSS).
 */
export function renderCustomerCardInnerHtml(payload, qrDataUrl, { rotate180 = false } = {}) {
  const p = payload;
  const addCol = p.showAdd;
  const headerCells = ["", "sph", "cyl", "Ax", ...(addCol ? ["Add"] : []), "FH"];
  const lensLine = p.lensLine || p.productLine || "Lens name: -";

  const bodyRows = (p.eyes || [])
    .map((row) => {
      const tds = [
        `<td class="eye">${escapeHtml(row.eye)}</td>`,
        `<td>${escapeHtml(row.sph)}</td>`,
        `<td>${escapeHtml(row.cyl)}</td>`,
        `<td>${escapeHtml(row.axis)}</td>`,
      ];
      if (addCol) {
        const addVal = hasAddValue(row.add) && row.add !== "-" ? row.add : "-";
        tds.push(`<td>${escapeHtml(addVal)}</td>`);
      }
      tds.push(`<td>${escapeHtml(row.fh)}</td>`);
      return `<tr>${tds.join("")}</tr>`;
    })
    .join("");

  const ths = headerCells.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const qrBlock = qrDataUrl
    ? `<img class="qr" src="${qrDataUrl}" alt="QR"/>`
    : `<div class="qr qr-ph"></div>`;

  const rotateClass = rotate180 ? " rotate-print" : "";

  return `<div class="card${rotateClass}">
  <div class="top-gap"></div>
  <div class="body">
    <div class="header-row">
      <div class="meta">
        <div class="line bold">${escapeHtml(lensLine)}</div>
        <div class="line">Coating: ${escapeHtml(p.coating || "-")}</div>
        <div class="line">Category: ${escapeHtml(p.category || p.categoryName || "-")}</div>
        <div class="line">Customer name: ${escapeHtml(p.customerName || "-")}</div>
        <div class="line">Pt. Name: ${escapeHtml(p.ptName || "-")}</div>
      </div>
      <div class="qr-wrap">${qrBlock}</div>
    </div>
    <table class="rx">
      <thead><tr>${ths}</tr></thead>
      <tbody>${bodyRows || `<tr><td colspan="${headerCells.length}" class="empty">No eye selected</td></tr>`}</tbody>
    </table>
    <div class="footer">
      <span>cust Ref: ${escapeHtml(p.customerRefNo)}</span>
      <span>Date: ${escapeHtml(p.orderDate)}</span>
    </div>
  </div>
</div>`;
}

export function customerCardCss() {
  return `
@page { size: 84mm 55mm; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
.card {
  width: 84mm; height: 55mm;
  font-family: Arial, Helvetica, sans-serif;
  color: #000; background: #fff;
  overflow: hidden; page-break-after: always;
  position: relative;
}
.card:last-child { page-break-after: auto; }
/* DISABLED: card loaded upside down in Evolis tray — may recheck 180° print later
.card.rotate-print {
  transform: rotate(180deg);
  transform-origin: center center;
}
*/
.top-gap { height: 7mm; width: 100%; flex-shrink: 0; }
.body {
  height: 48mm; padding: 1.5mm 2.2mm 2mm;
  display: flex; flex-direction: column; gap: 0.5mm;
}
.header-row { display: flex; gap: 2mm; align-items: flex-start; flex-shrink: 0; }
.meta { flex: 1; min-width: 0; font-size: 10px; line-height: 1.4; }
.meta .bold { font-weight: bold; font-size: 10.5px; }
.line { margin-bottom: 0.6mm; }
.qr-wrap { flex-shrink: 0; width: 14mm; height: 14mm; }
.qr { width: 14mm; height: 14mm; display: block; }
.qr-ph { width: 14mm; height: 14mm; background: #eee; border: 1px solid #ccc; }
table.rx {
  width: 100%; border-collapse: collapse;
  font-size: 9.5px; table-layout: fixed;
  flex: 1;
}
table.rx th, table.rx td {
  border: 0.4px solid #333; padding: 1.2mm 0.8mm; text-align: center;
}
table.rx th { font-weight: bold; background: #f3f3f3; font-size: 9px; }
table.rx td.eye { font-weight: bold; width: 7mm; }
table.rx td.empty { text-align: left; color: #666; }
.footer {
  margin-top: auto; padding-top: 0;
  display: flex; justify-content: space-between;
  font-size: 9.5px; flex-shrink: 0;
}
`;
}

export function buildCustomerCardHtmlDocument(payloads, qrMap = {}, { rotate180 = false } = {}) {
  const cards = payloads
    .map((p) => renderCustomerCardInnerHtml(p, qrMap[p.orderNo] || null, { rotate180 }))
    .join("\n");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>DC Customer Card</title>
<style>${customerCardCss()}</style></head><body>${cards}</body></html>`;
}

export async function makeOrderQrDataUrl(orderNo) {
  if (!orderNo) return null;
  try {
    return await QRCode.toDataURL(String(orderNo), {
      width: 160,
      margin: 0,
      errorCorrectionLevel: "M",
    });
  } catch {
    return null;
  }
}

/** Chrome print one or more cards (multi-page), upright (tray orientation). */
export async function chromePrintCustomerCards(ordersOrPayloads) {
  const payloads = (ordersOrPayloads || []).map((o) =>
    o?.eyes != null && (o?.lensLine != null || o?.productLine != null)
      ? o
      : buildCustomerCardPayload(o)
  );
  if (!payloads.length) return;
  const qrMap = {};
  for (const p of payloads) {
    if (p.orderNo && !qrMap[p.orderNo]) {
      qrMap[p.orderNo] = await makeOrderQrDataUrl(p.orderNo);
    }
  }
  // rotate180: false — physical card upside down in Evolis; may recheck 180° later
  const html = buildCustomerCardHtmlDocument(payloads, qrMap, { rotate180: false });
  printHtmlDocument(html, { title: "DC Customer Card", delayMs: 350 });
}

/**
 * Print one DC Customer Card (mode from Settings).
 */
export async function printCustomerCard(order, opts = {}) {
  const payload = buildCustomerCardPayload(order);
  if (!payload.orderNo) throw new Error("Order number missing for DC Customer Card.");

  const configs = opts.configs || (await loadPrinterConfigMap());
  const cfg = configs.AUTHENTICITY_CARD || {};
  const mode = getPrintModeFromConfig(cfg, false, "exe");

  if (mode === "chrome") {
    await chromePrintCustomerCards([payload]);
    return { mode: "chrome" };
  }

  const health = await checkPrintServiceHealth();
  if (!health) throw new Error("Print service not running. Start LensPrintService.exe.");
  if (!cfg.printer_name) {
    throw new Error("No DC Customer Card printer configured. Go to Settings → Print Service.");
  }
  await printRawToPrinter({
    printerName: cfg.printer_name,
    printType: "AUTHENTICITY_CARD",
    payload,
  });
  return { mode: "exe", printerName: cfg.printer_name };
}
