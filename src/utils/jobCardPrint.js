import QRCode from "qrcode";
import { formatJobCardDate } from "@/components/LensPrint/previews/JobCardPreview";
import {
  checkPrintServiceHealth,
  getPrinterConfigs,
  printRawToPrinter,
} from "@/services/printerConfig";

function parseExtraConfig(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function getPrintModeFromConfig(cfg, chromeOnly = false, defaultMode = "exe") {
  if (chromeOnly) return "chrome";
  const extra = parseExtraConfig(cfg?.extra_config);
  return extra.printMode === "chrome" ? "chrome" : defaultMode;
}

export async function loadPrinterConfigMap() {
  const res = await getPrinterConfigs();
  const map = {};
  if (res?.success && Array.isArray(res.data)) {
    res.data.forEach((c) => {
      map[c.config_type] = c;
    });
  }
  return map;
}

function buildJobCardHtml({ orderNo, customerRefNo, orderDate, qrDataUrl }) {
  const ref = customerRefNo && String(customerRefNo).trim() ? customerRefNo : "-";
  const dateStr = formatJobCardDate(orderDate);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Job Card ${orderNo}</title>
<style>
  /* Physical label size when printing */
  @page { size: 25mm 10mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }

  .card {
    width: 25mm; height: 10mm;
    display: flex; flex-direction: row; align-items: stretch;
    font-family: Arial, Helvetica, sans-serif; overflow: hidden;
    background: #fff; color: #000;
  }
  .qr { width: 9mm; display: flex; align-items: center; justify-content: center; padding: 0.6mm; flex-shrink: 0; }
  .qr img { width: 8mm; height: 8mm; display: block; }
  .sep { width: 0.4mm; background: #333; margin: 0.8mm 0; flex-shrink: 0; }
  .info {
    flex: 1; display: flex; flex-direction: column; justify-content: center;
    padding: 0.5mm 1mm; line-height: 1.15; min-width: 0;
  }
  .so { font-size: 5.5pt; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ref, .dt { font-size: 4.5pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Screen / Chrome dialog: scale up so 25×10 mm is readable (not a speck on A4) */
  @media screen {
    html, body {
      width: 100%; height: 100%;
      background: #e8e8e8;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .hint {
      font-family: system-ui, sans-serif;
      font-size: 13px; color: #444; margin-bottom: 16px; text-align: center; max-width: 360px;
    }
    .stage {
      background: #fff;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 4px 24px rgba(0,0,0,.12);
    }
    .card {
      /* ~8× visual scale: 25mm≈200px, 10mm≈80px at 96dpi → use fixed px for preview */
      width: 200px; height: 80px;
      border: 1px solid #ccc;
    }
    .qr { width: 72px; padding: 4px; }
    .qr img { width: 64px; height: 64px; }
    .sep { width: 2px; margin: 6px 0; }
    .info { padding: 4px 8px; }
    .so { font-size: 14px; }
    .ref, .dt { font-size: 11px; }
  }

  @media print {
    .hint, .stage { display: contents; }
    .hint { display: none !important; }
    html, body { width: 25mm; height: 10mm; background: #fff; }
    .card { width: 25mm; height: 10mm; border: none; }
  }
</style></head><body>
<p class="hint">Job Card preview (actual print size <strong>25 × 10 mm</strong>).<br/>
In the print dialog, choose your <strong>label printer</strong> or set paper to 25×10 mm — not A4.</p>
<div class="stage">
<div class="card">
  <div class="qr">${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR"/>` : ""}</div>
  <div class="sep"></div>
  <div class="info">
    <div class="so">${escapeHtml(orderNo)}</div>
    <div class="ref">Ref: ${escapeHtml(ref)}</div>
    <div class="dt">${escapeHtml(dateStr)}</div>
  </div>
</div>
</div>
</body></html>`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function chromePrintHtml(html) {
  // Hidden iframe — avoids a leftover about:blank window after the print dialog closes
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Job Card Print");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  };

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    cleanup();
    throw new Error("Could not open print frame for Job Card.");
  }

  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  setTimeout(() => {
    try {
      if (win) {
        win.onafterprint = cleanup;
        win.focus();
        win.print();
      }
      // Safety cleanup if onafterprint never fires (Cancel on some browsers)
      setTimeout(cleanup, 2000);
    } catch {
      cleanup();
    }
  }, 400);
}

/**
 * Print Job Card for a sale order.
 * @param {object} order — needs orderNo, customerRefNo, orderDate
 * @param {object} [opts]
 */
export async function printJobCard(order, opts = {}) {
  const orderNo = order?.orderNo || order?.order_number;
  if (!orderNo) throw new Error("Sale order number missing for Job Card.");

  const configs = opts.configs || (await loadPrinterConfigMap());
  const cfg = configs.JOB_CARD || {};
  const mode = getPrintModeFromConfig(cfg, false, "exe");
  const qrDataUrl = await QRCode.toDataURL(orderNo, {
    width: 200,
    margin: 0,
    errorCorrectionLevel: "M",
  });
  const html = buildJobCardHtml({
    orderNo,
    customerRefNo: order?.customerRefNo,
    orderDate: order?.orderDate,
    qrDataUrl,
  });

  if (mode === "chrome") {
    chromePrintHtml(html);
    return { mode: "chrome" };
  }

  const health = await checkPrintServiceHealth();
  if (!health) {
    throw new Error("Print service not running. Start LensPrintService.exe or switch Job Card to Chrome print.");
  }
  const printerName = cfg.printer_name;
  if (!printerName) {
    throw new Error("No Job Card printer configured. Go to Settings → Print Service.");
  }

  // Send as HTML via raw text path — Windows driver may rasterize; also open chrome as fallback note
  // Prefer opening a silent print via service with plain text + QR not available in ZPL easily.
  // For EXE mode: open hidden iframe chrome print targeting named printer is unreliable;
  // use service test-style raw + instruct, OR chromePrint with user selecting printer.
  // Practical approach: EXE mode still uses local service health check then browser print
  // with @page size (user picks Job Card printer once). True silent TSPL later.
  try {
    await printRawToPrinter({
      printerName,
      printType: "JOB_CARD",
      payload: {
        orderNo,
        customerRefNo: order?.customerRefNo || "-",
        orderDate: formatJobCardDate(order?.orderDate),
        qrValue: orderNo,
      },
    });
    return { mode: "exe", printerName };
  } catch {
    // Fallback: Chrome-sized print so user can pick the label printer
    chromePrintHtml(html);
    return { mode: "chrome-fallback", printerName };
  }
}

export { buildJobCardHtml, formatJobCardDate };
