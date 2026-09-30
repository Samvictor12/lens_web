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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Print service returned an error');
  }
  return res.json();
}

export async function testLocalPrinter({ printerName, printType }) {
  const res = await fetch(`${PRINT_SERVICE_URL}/api/printers/test-print`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ printerName, printType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Test print failed: print service returned an error');
  }
  return res.json();
}

/** Generic document print via local LensPrintService (Job Card, barcode label, etc.) */
export async function printRawToPrinter({ printerName, printType, payload }) {
  const res = await fetch(`${PRINT_SERVICE_URL}/api/print/document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ printerName, printType, payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Print service document print failed');
  }
  return res.json();
}

// ── Printer config API (cloud backend) ───────────────────────────────────────

export const getPrinterConfigs = () =>
  apiClient('get', '/printer-config');

export const savePrinterConfig = (data) =>
  apiClient('put', '/printer-config', { data });
