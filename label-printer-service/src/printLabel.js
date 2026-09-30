const fs = require('fs');
const path = require('path');
const { getAppDir } = require('./settingsStore');
const { buildFgLabelZpl } = require('./zplBuilder');
const { buildFgLabelTspl } = require('./tsplBuilder');
const { buildBarcodeScriptZpl } = require('./barcodeScriptZpl');
const { printRawZpl, printPngImage, printBarcodeScriptRaw } = require('./windowsPrint');
const { resolveBarcodeType } = require('./barcodeType');

function buildFgLabelPng(value, options) {
  return require('./imageBuilder').buildFgLabelPng(value, options);
}

const PRINT_MODES = {
  AUTO: 'auto',
  IMAGE: 'image',
  TSPL: 'tspl',
  /** Proven send path from barcode_script.py (RAW, no StartPage) */
  BARCODE_SCRIPT: 'barcode-script',
  DRY_RUN: 'dry-run',
};

function looksLikeTscPrinter(name) {
  return /tsc|te\d{2,3}|ttp|tdp|bar\s*code/i.test(String(name || ''));
}

function resolvePrintMode(settings = {}) {
  if (process.env.MES_PRINTER_DRY_RUN === '1' || process.env.MES_PRINTER_DRY_RUN === 'true') {
    return PRINT_MODES.DRY_RUN;
  }
  const mode = String(settings.printMode || PRINT_MODES.BARCODE_SCRIPT).toLowerCase();
  if (mode === 'image' || mode === 'image-only' || mode === '2') return PRINT_MODES.IMAGE;
  if (mode === 'tspl' || mode === 'tsc' || mode === '3') return PRINT_MODES.TSPL;
  if (
    mode === 'barcode-script' ||
    mode === 'barcodescript' ||
    mode === 'prn' ||
    mode === 'zpl-prn' ||
    mode === '4' ||
    mode === 'auto' ||
    mode === '1'
  ) {
    return PRINT_MODES.BARCODE_SCRIPT;
  }
  if (mode === 'dry-run' || mode === 'dryrun') return PRINT_MODES.DRY_RUN;
  return PRINT_MODES.BARCODE_SCRIPT;
}

function getPrintedDir() {
  return path.join(getAppDir(), 'printed');
}

/**
 * Sends proven ZPL template from barcode_script.py directly via Win32 RAW spooler.
 */
async function printLabel(value, settings = {}, deps = {}) {
  const text = String(value ?? '').trim();
  if (!text) {
    throw new Error('Print value is required');
  }

  const mode = resolvePrintMode(settings);
  const barcodeType = resolveBarcodeType(settings);
  const codeOpts = {
    barcodeType,
    labelSize: settings.labelSize,
    includeText: settings.includeText,
    topLabel: settings.topLabel,
    bottomLabel: settings.bottomLabel,
  };
  const printerName = settings.printerName;
  const rawPrinter = deps.printRawZpl || printRawZpl;
  const imagePrinter = deps.printPngImage || printPngImage;
  const barcodeScriptPrinter = deps.printBarcodeScriptRaw || printBarcodeScriptRaw;

  let pngPromise = null;
  const getPng = () => {
    if (!pngPromise) pngPromise = buildFgLabelPng(text, codeOpts);
    return pngPromise;
  };

  if (mode === PRINT_MODES.DRY_RUN) {
    const zpl = buildFgLabelZpl(text, codeOpts);
    const tspl = buildFgLabelTspl(text, codeOpts);
    const prn = buildBarcodeScriptZpl(text, codeOpts);
    const png = await getPng();
    const dir = getPrintedDir();
    fs.mkdirSync(dir, { recursive: true });
    const stamp = Date.now();
    const base = path.join(dir, `fg-label-${stamp}`);
    fs.writeFileSync(`${base}.zpl`, zpl, 'utf8');
    fs.writeFileSync(`${base}.tspl`, tspl, 'utf8');
    fs.writeFileSync(`${base}.prn`, prn, 'utf8');
    fs.writeFileSync(`${base}.png`, png);
    fs.writeFileSync(
      `${base}.json`,
      JSON.stringify(
        {
          value: text,
          printerName: printerName || null,
          printMode: mode,
          barcodeType,
          printedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      'utf8',
    );
    return { ok: true, mode, method: 'dry-run', barcodeType, artifactBase: base };
  }

  if (!printerName) {
    throw new Error('No printer configured. Run MES-Printer setup or reset settings.');
  }

  if (mode === PRINT_MODES.TSPL) {
    await rawPrinter(printerName, buildFgLabelTspl(text, codeOpts));
    return { ok: true, mode, method: 'tspl', barcodeType };
  }

  if (mode === PRINT_MODES.IMAGE) {
    await imagePrinter(printerName, await getPng());
    return { ok: true, mode, method: 'image', barcodeType };
  }

  // Primary mode (BARCODE_SCRIPT / AUTO): Send exact ZPL from barcode_script.py to all printers
  const payload = buildBarcodeScriptZpl(text, codeOpts);
  try {
    await barcodeScriptPrinter(printerName, payload);
    return {
      ok: true,
      mode,
      method: 'barcode-script-zpl',
      barcodeType,
    };
  } catch (zplErr) {
    // If RAW fails on an explicitly AUTO mode, attempt image fallback
    if (settings.printMode === 'auto') {
      try {
        await imagePrinter(printerName, await getPng());
        return {
          ok: true,
          mode,
          method: 'image-fallback',
          barcodeType,
          zplError: zplErr.message,
        };
      } catch (imgErr) {
        const err = new Error(
          `Print failed (RAW ZPL: ${zplErr.message}; Image: ${imgErr.message})`,
        );
        err.zplError = zplErr.message;
        err.imageError = imgErr.message;
        throw err;
      }
    }
    throw zplErr;
  }
}

module.exports = {
  printLabel,
  resolvePrintMode,
  looksLikeTscPrinter,
  PRINT_MODES,
  getPrintedDir,
};

