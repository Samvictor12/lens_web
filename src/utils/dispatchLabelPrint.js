import {
  checkPrintServiceHealth,
  getPrinterConfigs,
  printRawToPrinter,
} from "@/services/printerConfig";
import { getPrintModeFromConfig, loadPrinterConfigMap } from "@/utils/jobCardPrint";
import {
  printCustomerCard,
  chromePrintCustomerCards,
  buildCustomerCardPayload,
  makeOrderQrDataUrl,
} from "@/utils/customerCardPrint";
import { printHtmlDocument } from "@/utils/printHtmlDocument";

/**
 * Eyes to print for one SO — Right first, then Left (only selected eyes).
 * @returns {('R'|'L')[]}
 */
export function listBarcodeEyes(order) {
  const eyes = [];
  if (order?.rightEye) eyes.push("R");
  if (order?.leftEye) eyes.push("L");
  return eyes;
}

/**
 * Single-eye barcode payload — same field design as DC Customer Card.
 * One label = one eye row in a large Rx table + QR (orderNo).
 */
export function buildSingleEyeBarcodePayload(order, eye) {
  const card = buildCustomerCardPayload(order);
  const isR = eye === "R";
  const rx = isR ? card.right : card.left;
  const row = {
    eye,
    sph: rx.sph,
    cyl: rx.cyl,
    axis: rx.axis,
    add: rx.add,
    fh: rx.fh,
  };

  return {
    orderNo: card.orderNo,
    eye,
    lensLine: card.lensLine,
    productLine: card.lensLine,
    coating: card.coating,
    category: card.category,
    categoryName: card.categoryName,
    customerName: card.customerName,
    customerRefNo: card.customerRefNo,
    orderDate: card.orderDate,
    showAdd: card.showAdd,
    row,
    /** legacy / preview helpers */
    activeRx: {
      sph: rx.sph,
      cyl: rx.cyl,
      axis: rx.axis,
      add: rx.add,
      dia: rx.fh,
      fh: rx.fh,
    },
    right: card.right,
    left: card.left,
    rightEye: isR,
    leftEye: !isR,
  };
}

/** @deprecated use buildSingleEyeBarcodePayload — kept for Settings fixtures */
export function buildBarcodePayload(order) {
  const card = buildCustomerCardPayload(order);
  return {
    orderNo: card.orderNo,
    lensLine: card.lensLine,
    productLine: card.lensLine,
    coating: card.coating,
    category: card.category,
    ptName: card.ptName,
    customerName: card.customerName,
    customerRefNo: card.customerRefNo,
    orderDate: card.orderDate,
    showAdd: card.showAdd,
    leftEye: card.leftEye,
    rightEye: card.rightEye,
    left: { ...card.left, dia: card.left.fh },
    right: { ...card.right, dia: card.right.fh },
  };
}

const PX_PER_MM = 8;
/** Physical label: 75 mm wide × 50 mm tall (landscape). */
const LABEL_W = 75 * PX_PER_MM;
const LABEL_H = 50 * PX_PER_MM;
const FONT = "Arial, Helvetica, sans-serif";

export const BARCODE_CHROME_PRINT_HINT =
  "Chrome: Headers & footers OFF · Margins None · Scale 100% · Layout Portrait · Paper 75×50 mm";

function resolveBarcodeRow(p) {
  if (p?.row?.eye) return p.row;
  const rx = p?.activeRx || {};
  return {
    eye: p?.eye || "R",
    sph: rx.sph ?? "-",
    cyl: rx.cyl ?? "-",
    axis: rx.axis ?? "-",
    add: rx.add ?? "-",
    fh: rx.fh ?? rx.dia ?? "-",
  };
}

/**
 * Shared label paint — 75×50 mm landscape (preview + print).
 */
async function paintBarcodeLabel(ctx, width, height, payload, qrDataUrl) {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#000";
  ctx.textBaseline = "top";

  const p = payload || {};
  const row = resolveBarcodeRow(p);
  const showAdd = !!p.showAdd;
  const scale = height / LABEL_H;
  const pad = Math.round(14 * scale);
  const qrSize = Math.round(96 * scale);
  const metaMaxW = width - pad * 3 - qrSize;
  const lensSize = Math.round(22 * scale);
  const metaSize = Math.round(19 * scale);
  const metaLine = Math.round(23 * scale);
  const footSize = Math.round(18 * scale);
  const rowH = Math.round(36 * scale);

  if (qrDataUrl) {
    await drawImage(ctx, qrDataUrl, width - pad - qrSize, pad, qrSize, qrSize);
  }

  ctx.font = `bold ${lensSize}px ${FONT}`;
  let y = wrapText(
    ctx,
    p.lensLine || p.productLine || "Lens name: -",
    pad,
    pad,
    metaMaxW,
    Math.round(26 * scale),
    2
  );
  ctx.font = `${metaSize}px ${FONT}`;
  for (const line of [
    `Coating: ${p.coating || "-"}`,
    `Category: ${p.category || p.categoryName || "-"}`,
    `Customer name: ${p.customerName || "-"}`,
  ]) {
    ctx.fillText(fitText(ctx, line, metaMaxW), pad, y);
    y += metaLine;
  }

  const tableTop = Math.max(y + Math.round(8 * scale), pad + qrSize + Math.round(8 * scale));
  const footY = Math.max(tableTop + rowH * 2 + Math.round(6 * scale), height - pad - footSize);

  const headers = ["", "sph", "cyl", "Ax", ...(showAdd ? ["Add"] : []), "FH"];
  const vals = [
    String(row.eye || p.eye || ""),
    String(row.sph || "-"),
    String(row.cyl || "-"),
    String(row.axis || "-"),
    ...(showAdd ? [String(row.add && row.add !== "-" ? row.add : "-")] : []),
    String(row.fh || row.dia || "-"),
  ];
  const colW = (width - pad * 2) / headers.length;
  const headSize = Math.round(20 * scale);
  const valSize = Math.round(26 * scale);
  const eyeSize = Math.round(28 * scale);

  headers.forEach((h, c) => {
    drawCellText(ctx, h, pad + c * colW, tableTop, colW, rowH, headSize, true);
  });
  vals.forEach((v, c) => {
    drawCellText(
      ctx,
      v,
      pad + c * colW,
      tableTop + rowH,
      colW,
      rowH,
      c === 0 ? eyeSize : valSize,
      c === 0
    );
  });

  ctx.font = `${footSize}px ${FONT}`;
  ctx.fillText(`cust Ref: ${p.customerRefNo || "-"}`, pad, footY);
  const dateStr = `Date: ${p.orderDate || "-"}`;
  ctx.fillText(dateStr, width - pad - ctx.measureText(dateStr).width, footY);
}

/** 75×50 mm landscape — preview and Chrome/EXE artwork. */
export async function renderBarcodeArtworkCanvas(payload, qrDataUrl) {
  const canvas = document.createElement("canvas");
  canvas.width = LABEL_W;
  canvas.height = LABEL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available for barcode print.");
  await paintBarcodeLabel(ctx, LABEL_W, LABEL_H, payload, qrDataUrl);
  return canvas;
}

/** @deprecated alias — same as renderBarcodeArtworkCanvas */
export async function renderBarcodePrintCanvas(payload, qrDataUrl) {
  return renderBarcodeArtworkCanvas(payload, qrDataUrl);
}

/** Upright artwork as a PNG data URL (for on-screen preview). */
export async function buildBarcodeArtworkDataUrl(payload) {
  const qr = await makeOrderQrDataUrl(payload?.orderNo);
  const canvas = await renderBarcodeArtworkCanvas(payload, qr);
  return canvas.toDataURL("image/png");
}

function fitText(ctx, text, maxW) {
  let s = String(text);
  if (ctx.measureText(s).width <= maxW) return s;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
  return `${s}…`;
}

/** Word-wrap up to maxLines; returns the y below the last line. */
function wrapText(ctx, text, x, y, maxW, lineH, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(test).width > maxW) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, maxLines);
  if (lines.length > maxLines) shown[maxLines - 1] = lines.slice(maxLines - 1).join(" ");
  shown.forEach((l, i) => ctx.fillText(fitText(ctx, l, maxW), x, y + i * lineH));
  return y + shown.length * lineH;
}

function drawCellText(ctx, text, x, y, w, h, size, bold) {
  ctx.fillStyle = "#000";
  ctx.font = `${bold ? "bold " : ""}${size}px ${FONT}`;
  const label = fitText(ctx, text, w - 6);
  ctx.fillText(label, x + (w - ctx.measureText(label).width) / 2, y + (h - size) / 2);
}

function drawImage(ctx, src, x, y, w, h) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, x, y, w, h);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

/**
 * Chrome print — one 75×50 mm PNG page per eye (same canvas as preview).
 */
export async function chromePrintBarcodeLabels(payloads) {
  if (!payloads.length) return;
  const qrMap = {};
  for (const p of payloads) {
    if (p.orderNo && !qrMap[p.orderNo]) {
      qrMap[p.orderNo] = await makeOrderQrDataUrl(p.orderNo);
    }
  }

  const imgs = [];
  for (const p of payloads) {
    const canvas = await renderBarcodeArtworkCanvas(p, qrMap[p.orderNo] || null);
    imgs.push(canvas.toDataURL("image/png"));
  }

  const pages = imgs
    .map(
      (src) =>
        `<div class="page"><img src="${src}" width="75mm" height="50mm" alt=""/></div>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title></title>
<style>
@page {
  margin: 0;
}
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: 100%;
  height: auto;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  background: #fff;
  overflow: hidden;
}
.stage {
  display: block;
  margin: 0 !important;
  padding: 0 !important;
  font-size: 0;
  line-height: 0;
}
.page {
  width: 74.5mm;
  height: 49.5mm;
  max-width: 74.5mm;
  max-height: 49.5mm;
  overflow: hidden;
  margin: 0 !important;
  padding: 0 !important;
  font-size: 0;
  line-height: 0;
  page-break-inside: avoid;
  break-inside: avoid;
}
.page:not(:last-child) {
  page-break-after: always;
  break-after: page;
}
.page:last-child {
  page-break-after: avoid;
  break-after: avoid;
}
.page img {
  width: 74.5mm;
  height: 49.5mm;
  max-width: 74.5mm;
  max-height: 49.5mm;
  display: block;
  object-fit: fill;
  margin: 0 !important;
  padding: 0 !important;
}
</style></head><body>
<div class="stage">${pages}</div>
</body></html>`;

  printHtmlDocument(html, { title: " ", delayMs: 500, waitForImages: true });
}

/** Print DC Customer Barcode for one SO — separate physical labels, R then L. */
export async function printCustomerBarcode(order, opts = {}) {
  const eyes = listBarcodeEyes(order);
  if (!order?.orderNo && !order?.order_number) {
    throw new Error("Order number missing for barcode print.");
  }
  if (!eyes.length) {
    throw new Error("No eye selected — nothing to print on barcode label.");
  }

  const configs = opts.configs || (await loadPrinterConfigMap());
  const cfg = configs.BARCODE_LABEL || {};
  const mode = getPrintModeFromConfig(cfg, false, "exe");
  const payloads = eyes.map((eye) => buildSingleEyeBarcodePayload(order, eye));

  if (mode === "chrome") {
    await chromePrintBarcodeLabels(payloads);
    return { mode: "chrome", labels: payloads.length };
  }

  const health = await checkPrintServiceHealth();
  if (!health) throw new Error("Print service not running. Start LensPrintService.exe.");
  if (!cfg.printer_name) {
    throw new Error("No barcode printer configured. Go to Settings → Print Service.");
  }
  for (const payload of payloads) {
    await printRawToPrinter({
      printerName: cfg.printer_name,
      printType: "BARCODE_LABEL",
      payload,
    });
  }
  return { mode: "exe", printerName: cfg.printer_name, labels: payloads.length };
}

export { printCustomerCard, buildCustomerCardPayload };

/**
 * Build print plan: modes, preview items, Cards-then-Barcodes order.
 */
export async function buildDispatchPrintPlan(orders, flags = {}) {
  const { printCard = false, printBarcode = false } = flags;
  const list = Array.isArray(orders) ? orders.filter(Boolean) : [];
  const configs = await loadPrinterConfigMap();
  const cardCfg = configs.AUTHENTICITY_CARD || {};
  const barcodeCfg = configs.BARCODE_LABEL || {};
  const cardMode = printCard ? getPrintModeFromConfig(cardCfg, false, "exe") : null;
  const barcodeMode = printBarcode ? getPrintModeFromConfig(barcodeCfg, false, "exe") : null;

  const cardOrders = printCard ? list : [];
  const cardPayloads = cardOrders.map((o) => ({
    order: o,
    payload: buildCustomerCardPayload(o),
  }));
  const barcodeItems = [];
  if (printBarcode) {
    for (const order of list) {
      for (const eye of listBarcodeEyes(order)) {
        barcodeItems.push({
          order,
          eye,
          payload: buildSingleEyeBarcodePayload(order, eye),
        });
      }
    }
  }

  const needsExePreview =
    (cardMode === "exe" && cardOrders.length > 0) ||
    (barcodeMode === "exe" && barcodeItems.length > 0);

  return {
    orders: list,
    printCard,
    printBarcode,
    configs,
    cardMode,
    barcodeMode,
    cardOrders,
    cardPayloads,
    barcodeItems,
    needsExePreview,
    previewCards: cardMode === "exe" ? cardOrders : [],
    previewCardPayloads: cardMode === "exe" ? cardPayloads : [],
    previewBarcodes: barcodeMode === "exe" ? barcodeItems : [],
  };
}

/**
 * Execute plan: all Cards first, then all Barcodes (R→L).
 */
export async function executeDispatchPrintPlan(plan) {
  if (!plan) return { printed: 0, errors: [] };
  const {
    cardOrders = [],
    barcodeItems = [],
    cardMode,
    barcodeMode,
    configs,
    printCard,
    printBarcode,
  } = plan;

  let printed = 0;
  const errors = [];

  if (printCard && cardOrders.length) {
    if (cardMode === "exe") {
      for (const order of cardOrders) {
        try {
          await printCustomerCard(order, { configs });
          printed += 1;
        } catch (e) {
          errors.push(`${order.orderNo || order.id} card: ${e.message}`);
        }
      }
    } else if (cardMode === "chrome") {
      try {
        await chromePrintCustomerCards(cardOrders);
        printed += cardOrders.length;
      } catch (e) {
        errors.push(`card chrome: ${e.message}`);
      }
    }
  }

  if (printBarcode && barcodeItems.length) {
    if (barcodeMode === "exe") {
      const cfg = configs.BARCODE_LABEL || {};
      try {
        const health = await checkPrintServiceHealth();
        if (!health) throw new Error("Print service not running. Start LensPrintService.exe.");
        if (!cfg.printer_name) {
          throw new Error("No barcode printer configured. Go to Settings → Print Service.");
        }
        for (const item of barcodeItems) {
          try {
            await printRawToPrinter({
              printerName: cfg.printer_name,
              printType: "BARCODE_LABEL",
              payload: item.payload,
            });
            printed += 1;
          } catch (e) {
            errors.push(
              `${item.order?.orderNo || item.order?.id} barcode ${item.eye}: ${e.message}`
            );
          }
        }
      } catch (e) {
        errors.push(`barcode batch: ${e.message}`);
      }
    } else if (barcodeMode === "chrome") {
      try {
        await chromePrintBarcodeLabels(barcodeItems.map((i) => i.payload));
        printed += barcodeItems.length;
      } catch (e) {
        errors.push(`barcode chrome: ${e.message}`);
      }
    }
  }

  if (errors.length && printed === 0) {
    throw new Error(errors[0]);
  }
  return { printed, errors };
}

export async function printDispatchLabelsForOrders(orders, flags = {}) {
  const plan = await buildDispatchPrintPlan(orders, flags);
  if (!plan.printCard && !plan.printBarcode) return { printed: 0 };
  return executeDispatchPrintPlan(plan);
}

export { getPrinterConfigs };
