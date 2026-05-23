import { apiClient } from './apiClient';

const PRINT_SERVICE_URL = 'http://127.0.0.1:9333';
const PRINT_SERVICE_TIMEOUT = 2000; // 2s — fast fail if not running

// ── Local print service (Python) ─────────────────────────────────────────────

export async function checkPrintServiceHealth() {
  try {
    const ctrl = new AbortController();
    const id   = setTimeout(() => ctrl.abort(), PRINT_SERVICE_TIMEOUT);
    const res  = await fetch(`${PRINT_SERVICE_URL}/health`, { signal: ctrl.signal });
    clearTimeout(id);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function getLocalPrinters() {
  const ctrl = new AbortController();
  const id   = setTimeout(() => ctrl.abort(), PRINT_SERVICE_TIMEOUT);
  const res  = await fetch(`${PRINT_SERVICE_URL}/api/printers`, { signal: ctrl.signal });
  clearTimeout(id);
  if (!res.ok) throw new Error('Failed to fetch printers from local service');
  return res.json(); // { printers: [...] }
}

export async function printBarcodeLabels({ printerName, topLabel, barcodeSerials, bottomLabels, labelWidth }) {
  const res = await fetch(`${PRINT_SERVICE_URL}/api/barcode/generateAndPrintBulk`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      printerName:   { Printer_name: printerName },
      topLabel,
      barcodeSerial: barcodeSerials,
      bottomLabel:   bottomLabels,
      labelWidth:    labelWidth ?? 180,
    }),
  });
  if (!res.ok) throw new Error('Print service returned an error');
  return res.json();
}

// ── Printer config API (cloud backend) ───────────────────────────────────────

export const getPrinterConfigs = () =>
  apiClient('get', '/printer-config');

export const savePrinterConfig = (data) =>
  apiClient('put', '/printer-config', data);
