const readline = require('readline');
const { loadSettings, saveSettings } = require('./settingsStore');
const { listPrinters } = require('./listPrinters');
const { PRINT_MODES } = require('./printLabel');
const { BARCODE_TYPES, resolveBarcodeType } = require('./barcodeType');

const DEFAULT_PORT = 8081;

const MODE_OPTIONS = [
  {
    number: '1',
    key: PRINT_MODES.BARCODE_SCRIPT,
    label: 'RAW ZPL (Proven barcode_script.py pipeline - Recommended)',
  },
  {
    number: '2',
    key: PRINT_MODES.AUTO,
    label: 'Auto (RAW ZPL with Image fallback)',
  },
  {
    number: '3',
    key: PRINT_MODES.IMAGE,
    label: 'Image only (10x10mm GDI, gap 2mm)',
  },
  {
    number: '4',
    key: PRINT_MODES.TSPL,
    label: 'TSC TSPL RAW only',
  },
];

const BARCODE_TYPE_OPTIONS = [
  { number: '1', key: BARCODE_TYPES.QR, label: 'Normal QR' },
  { number: '2', key: BARCODE_TYPES.DATAMATRIX, label: 'Data Matrix' },
];

const LABEL_SIZE_OPTIONS = [
  { number: '1', key: '10x25', label: '10mm × 25mm (Standard barcode_script size)' },
  { number: '2', key: '10x12.5', label: '10mm × 12.5mm (Small FG label)' },
  { number: '3', key: '10x10', label: '10mm × 10mm (Micro FG label)' },
  { number: '4', key: '13x13', label: '13mm × 13mm (Square FG label - BIXOLON XD5 / 300dpi)' },
];

const TEXT_OPTIONS = [
  { number: '1', key: false, label: 'Code Only (QR / Data Matrix only — Clean & Recommended)' },
  { number: '2', key: true, label: 'Code with Text (Include printed serial text)' },
];

function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function withSettingsDefaults(settings) {
  return {
    ...settings,
    port: Number(settings.port) || DEFAULT_PORT,
    printMode: settings.printMode || PRINT_MODES.BARCODE_SCRIPT,
    labelSize: settings.labelSize || '10x25',
    includeText: Boolean(settings.includeText),
    barcodeType: resolveBarcodeType(settings.barcodeType || BARCODE_TYPES.QR),
  };
}

function createRl() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function promptPrinter(rl, printers, callback) {
  console.log('');
  console.log('Available printers:');
  if (!printers.length) {
    console.log('  (none found — you can still enter a printer name manually)');
  } else {
    printers.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));
  }
  console.log('');

  const ask = () => {
    rl.question(
      printers.length
        ? `Enter choice (1-${printers.length}) or paste printer name: `
        : 'Paste printer name: ',
      (answer) => {
        const raw = String(answer || '').trim();
        if (!raw) {
          console.log('Please select or enter a printer.');
          ask();
          return;
        }
        const asNum = Number(raw);
        if (printers.length && Number.isInteger(asNum) && asNum >= 1 && asNum <= printers.length) {
          callback(printers[asNum - 1]);
          return;
        }
        callback(raw);
      },
    );
  };
  ask();
}

function promptPrintMode(rl, callback) {
  console.log('');
  console.log('Print mode:');
  MODE_OPTIONS.forEach((opt) => console.log(`  ${opt.number}. ${opt.label}`));
  console.log('');

  const ask = () => {
    rl.question('Enter choice (1-4): ', (answer) => {
      const choice = MODE_OPTIONS.find((opt) => opt.number === answer.trim());
      if (!choice) {
        console.log('Invalid choice, please enter 1, 2, 3, or 4.');
        ask();
        return;
      }
      callback(choice.key);
    });
  };
  ask();
}

function promptBarcodeType(rl, callback) {
  console.log('');
  console.log('Barcode type:');
  BARCODE_TYPE_OPTIONS.forEach((opt) => console.log(`  ${opt.number}. ${opt.label}`));
  console.log('');

  const ask = () => {
    rl.question('Enter choice (1-2): ', (answer) => {
      const choice = BARCODE_TYPE_OPTIONS.find((opt) => opt.number === answer.trim());
      if (!choice) {
        console.log('Invalid choice, please enter 1 or 2.');
        ask();
        return;
      }
      callback(choice.key);
    });
  };
  ask();
}

function promptLabelSize(rl, callback) {
  console.log('');
  console.log('Label size:');
  LABEL_SIZE_OPTIONS.forEach((opt) => console.log(`  ${opt.number}. ${opt.label}`));
  console.log('');

  const ask = () => {
    rl.question('Enter choice (1-4): ', (answer) => {
      const choice = LABEL_SIZE_OPTIONS.find((opt) => opt.number === answer.trim());
      if (!choice) {
        console.log('Invalid choice, please enter 1, 2, 3, or 4.');
        ask();
        return;
      }
      callback(choice.key);
    });
  };
  ask();
}

function promptTextOption(rl, callback) {
  console.log('');
  console.log('Text formatting:');
  TEXT_OPTIONS.forEach((opt) => console.log(`  ${opt.number}. ${opt.label}`));
  console.log('');

  const ask = () => {
    rl.question('Enter choice (1-2) [default 1]: ', (answer) => {
      const trimmed = String(answer || '').trim();
      if (!trimmed || trimmed === '1') {
        callback(false);
        return;
      }
      if (trimmed === '2') {
        callback(true);
        return;
      }
      console.log('Invalid choice, please enter 1 or 2.');
      ask();
    });
  };
  ask();
}

function promptPort(rl, callback) {
  rl.question(`Listen port [default ${DEFAULT_PORT}]: `, (answer) => {
    const raw = String(answer || '').trim();
    if (!raw) {
      callback(DEFAULT_PORT);
      return;
    }
    const port = Number(raw);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      console.log('Invalid port, using 8081.');
      callback(DEFAULT_PORT);
      return;
    }
    callback(port);
  });
}

/**
 * Ensures printer settings exist.
 * Missing barcodeType defaults to Normal QR (never blocks silent startup).
 * @param {{ listPrintersFn?: Function, loadSettingsFn?: Function, saveSettingsFn?: Function, interactive?: boolean }} [opts]
 */
function ensureSettings(opts = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const load = opts.loadSettingsFn || loadSettings;
      const save = opts.saveSettingsFn || saveSettings;
      const existing = load();
      const interactive = opts.interactive !== undefined ? opts.interactive : isInteractive();
      const needsPrinter = !existing.printerName;
      const needsMode = !existing.printMode;
      const needsLabelSize = !existing.labelSize && interactive;
      const needsText = existing.includeText === undefined && interactive;
      const needsPort = existing.port === undefined || existing.port === null;
      const needsBarcodeType = !existing.barcodeType && interactive;

      if (!needsPrinter && !needsMode && !needsBarcodeType && !needsLabelSize && !needsText && !needsPort) {
        const settings = withSettingsDefaults(existing);
        if (!existing.barcodeType) save(settings);
        resolve(settings);
        return;
      }

      if (!interactive) {
        if (!existing.printerName) {
          reject(
            new Error(
              'Printer is not configured and no console is available. Run MES-Printer.exe once to set it up.',
            ),
          );
          return;
        }
        const settings = withSettingsDefaults({
          ...existing,
          printMode: existing.printMode || PRINT_MODES.BARCODE_SCRIPT,
          labelSize: existing.labelSize || '10x25',
          includeText: Boolean(existing.includeText),
        });
        save(settings);
        resolve(settings);
        return;
      }

      const listFn = opts.listPrintersFn || listPrinters;
      const printers = needsPrinter ? await listFn() : [];
      const rl = createRl();

      const finish = (settings) => {
        const saved = withSettingsDefaults(settings);
        save(saved);
        console.log('');
        console.log(`Saved. Printer: "${saved.printerName}"`);
        console.log(`Print mode: ${saved.printMode}`);
        console.log(`Label size: ${saved.labelSize}`);
        console.log(`Text mode: ${saved.includeText ? 'With Text' : 'Code Only'}`);
        console.log(`Barcode type: ${saved.barcodeType}`);
        console.log(`Listening on http://localhost:${saved.port}`);
        console.log('(Future launches use this automatically. Run MES-Printer-Reset to change.)');
        console.log('');
        rl.close();
        resolve(saved);
      };

      const withPort = (partial) => {
        if (needsPort) {
          promptPort(rl, (port) => finish({ ...partial, port }));
        } else {
          finish({ ...partial, port: Number(existing.port) || DEFAULT_PORT });
        }
      };

      const withText = (partial) => {
        if (needsText) {
          promptTextOption(rl, (includeText) => withPort({ ...partial, includeText }));
        } else {
          withPort({ ...partial, includeText: Boolean(existing.includeText) });
        }
      };

      const withLabelSize = (partial) => {
        if (needsLabelSize) {
          promptLabelSize(rl, (labelSize) => withText({ ...partial, labelSize }));
        } else {
          withText({ ...partial, labelSize: existing.labelSize });
        }
      };

      const withBarcodeType = (partial) => {
        if (needsBarcodeType) {
          promptBarcodeType(rl, (barcodeType) => withLabelSize({ ...partial, barcodeType }));
        } else {
          withLabelSize({ ...partial, barcodeType: existing.barcodeType });
        }
      };

      const withMode = (partial) => {
        if (needsMode) {
          promptPrintMode(rl, (printMode) => withBarcodeType({ ...partial, printMode }));
        } else {
          withBarcodeType({ ...partial, printMode: existing.printMode });
        }
      };

      if (needsPrinter) {
        promptPrinter(rl, printers, (printerName) => {
          withMode({ ...existing, printerName });
        });
      } else {
        withMode({ ...existing });
      }
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  ensureSettings,
  isInteractive,
  withSettingsDefaults,
  DEFAULT_PORT,
  MODE_OPTIONS,
  BARCODE_TYPE_OPTIONS,
  LABEL_SIZE_OPTIONS,
  TEXT_OPTIONS,
};


