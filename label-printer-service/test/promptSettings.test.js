const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { ensureSettings, withSettingsDefaults, BARCODE_TYPE_OPTIONS } = require('../src/promptSettings');
const { BARCODE_TYPES } = require('../src/barcodeType');

describe('BARCODE_TYPE_OPTIONS / ensureSettings', () => {
  it('exposes Normal QR and Data Matrix choices', () => {
    assert.equal(BARCODE_TYPE_OPTIONS.length, 2);
    assert.equal(BARCODE_TYPE_OPTIONS[0].key, BARCODE_TYPES.QR);
    assert.equal(BARCODE_TYPE_OPTIONS[1].key, BARCODE_TYPES.DATAMATRIX);
  });

  it('does not hang when barcodeType is missing and there is no console', async () => {
    const saved = [];
    const settings = await Promise.race([
      ensureSettings({
        interactive: false,
        loadSettingsFn: () => ({
          printerName: 'TSC TE210',
          printMode: 'auto',
          port: 8081,
        }),
        saveSettingsFn: (s) => {
          saved.push(s);
        },
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('hung waiting for barcode type')), 500);
      }),
    ]);
    assert.equal(settings.barcodeType, BARCODE_TYPES.QR);
    assert.equal(saved[0].barcodeType, BARCODE_TYPES.QR);
  });

  it('withSettingsDefaults fills qr + port', () => {
    const s = withSettingsDefaults({ printerName: 'P', printMode: 'auto' });
    assert.equal(s.barcodeType, BARCODE_TYPES.QR);
    assert.equal(s.port, 8081);
  });
});
