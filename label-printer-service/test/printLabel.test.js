const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const {
  printLabel,
  resolvePrintMode,
  looksLikeTscPrinter,
  PRINT_MODES,
} = require('../src/printLabel');

describe('resolvePrintMode', () => {
  it('maps settings and env', () => {
    const prev = process.env.MES_PRINTER_DRY_RUN;
    delete process.env.MES_PRINTER_DRY_RUN;
    assert.equal(resolvePrintMode({ printMode: 'auto' }), PRINT_MODES.BARCODE_SCRIPT);
    assert.equal(resolvePrintMode({ printMode: 'image' }), PRINT_MODES.IMAGE);
    assert.equal(resolvePrintMode({ printMode: '2' }), PRINT_MODES.IMAGE);
    assert.equal(resolvePrintMode({ printMode: 'tspl' }), PRINT_MODES.TSPL);
    assert.equal(resolvePrintMode({ printMode: '3' }), PRINT_MODES.TSPL);
    assert.equal(resolvePrintMode({ printMode: '4' }), PRINT_MODES.BARCODE_SCRIPT);
    assert.equal(resolvePrintMode({ printMode: 'barcode-script' }), PRINT_MODES.BARCODE_SCRIPT);
    assert.equal(resolvePrintMode({ printMode: 'dry-run' }), PRINT_MODES.DRY_RUN);
    process.env.MES_PRINTER_DRY_RUN = '1';
    assert.equal(resolvePrintMode({ printMode: 'barcode-script' }), PRINT_MODES.DRY_RUN);
    if (prev === undefined) delete process.env.MES_PRINTER_DRY_RUN;
    else process.env.MES_PRINTER_DRY_RUN = prev;
  });
});

describe('looksLikeTscPrinter', () => {
  it('detects common TSC names', () => {
    assert.equal(looksLikeTscPrinter('TSC TE210'), true);
    assert.equal(looksLikeTscPrinter('Zebra ZD420'), false);
  });
});

describe('printLabel orchestrator', () => {
  it('Primary mode sends proven barcode-script ZPL to all printers (including TSC)', async () => {
    let rawCalls = 0;
    let payload = '';
    const result = await printLabel(
      'PCB-01/09092026',
      { printerName: 'TSC TE210' },
      {
        printBarcodeScriptRaw: async (_name, raw) => {
          rawCalls += 1;
          payload = raw;
        },
      },
    );
    assert.equal(rawCalls, 1);
    assert.equal(result.method, 'barcode-script-zpl');
    assert.match(payload, /\^PW180/);
    assert.match(payload, /\^BQM,2\^FDMA,PCB-01\/09092026\^FS/);
  });

  it('Primary mode with Data Matrix uses ^BX in ZPL payload', async () => {
    let payload = '';
    const result = await printLabel(
      'PCB-01',
      { printerName: 'TSC TE210', barcodeType: 'datamatrix' },
      {
        printBarcodeScriptRaw: async (_name, raw) => {
          payload = raw;
        },
      },
    );
    assert.equal(result.method, 'barcode-script-zpl');
    assert.equal(result.barcodeType, 'datamatrix');
    assert.match(payload, /\^BXN,3,200/);
    assert.doesNotMatch(payload, /\^BQM/);
  });

  it('Auto mode: ZPL fail falls back to image', async () => {
    let zplCalls = 0;
    let imgCalls = 0;
    const result = await printLabel(
      'PCB-01/09092026',
      { printerName: 'Fake', printMode: 'auto' },
      {
        printBarcodeScriptRaw: async () => {
          zplCalls += 1;
          throw new Error('zpl boom');
        },
        printPngImage: async () => {
          imgCalls += 1;
        },
      },
    );
    assert.equal(zplCalls, 1);
    assert.equal(imgCalls, 1);
    assert.equal(result.method, 'image-fallback');
  });

  it('TSPL mode sends TSPL RAW when explicitly configured', async () => {
    let payload = '';
    let imgCalls = 0;
    const result = await printLabel(
      'PCB-01',
      { printerName: 'TSC TE210', printMode: 'tspl', barcodeType: 'qr' },
      {
        printRawZpl: async (_name, raw) => {
          payload = raw;
        },
        printPngImage: async () => {
          imgCalls += 1;
        },
      },
    );
    assert.equal(result.method, 'tspl');
    assert.equal(imgCalls, 0);
    assert.match(payload, /QRCODE/);
    assert.match(payload, /SIZE 10 mm,10 mm/);
  });

  it('Image-only mode never calls ZPL', async () => {
    let zplCalls = 0;
    let imgCalls = 0;
    const result = await printLabel(
      'PCB-01',
      { printerName: 'Fake', printMode: 'image' },
      {
        printBarcodeScriptRaw: async () => {
          zplCalls += 1;
        },
        printPngImage: async () => {
          imgCalls += 1;
        },
      },
    );
    assert.equal(zplCalls, 0);
    assert.equal(imgCalls, 1);
    assert.equal(result.method, 'image');
  });

  it('dry-run writes artifacts without spooler', async () => {
    const prev = process.env.MES_PRINTER_DRY_RUN;
    process.env.MES_PRINTER_DRY_RUN = '1';
    try {
      const result = await printLabel('DRY/09092026', { printerName: 'Unused' }, {
        printBarcodeScriptRaw: async () => {
          throw new Error('should not spool');
        },
        printPngImage: async () => {
          throw new Error('should not spool');
        },
      });
      assert.equal(result.method, 'dry-run');
      assert.ok(fs.existsSync(`${result.artifactBase}.json`));
      assert.ok(fs.existsSync(`${result.artifactBase}.zpl`));
      assert.ok(fs.existsSync(`${result.artifactBase}.tspl`));
      assert.ok(fs.existsSync(`${result.artifactBase}.prn`));
      assert.ok(fs.existsSync(`${result.artifactBase}.png`));
      const meta = JSON.parse(fs.readFileSync(`${result.artifactBase}.json`, 'utf8'));
      assert.equal(meta.value, 'DRY/09092026');
    } finally {
      if (prev === undefined) delete process.env.MES_PRINTER_DRY_RUN;
      else process.env.MES_PRINTER_DRY_RUN = prev;
    }
  });

  it('rejects empty value', async () => {
    await assert.rejects(() => printLabel('', { printMode: 'dry-run' }), /required/i);
  });
});

