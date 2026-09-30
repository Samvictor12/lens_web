const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { BARCODE_TYPES, resolveBarcodeType, isDataMatrix } = require('../src/barcodeType');

describe('resolveBarcodeType', () => {
  it('defaults to QR', () => {
    assert.equal(resolveBarcodeType(), BARCODE_TYPES.QR);
    assert.equal(resolveBarcodeType({}), BARCODE_TYPES.QR);
    assert.equal(resolveBarcodeType({ barcodeType: 'qr' }), BARCODE_TYPES.QR);
    assert.equal(isDataMatrix({ barcodeType: '1' }), false);
  });

  it('maps Data Matrix aliases', () => {
    assert.equal(resolveBarcodeType('2'), BARCODE_TYPES.DATAMATRIX);
    assert.equal(resolveBarcodeType({ barcodeType: 'datamatrix' }), BARCODE_TYPES.DATAMATRIX);
    assert.equal(resolveBarcodeType({ barcodeType: 'Data-Matrix' }), BARCODE_TYPES.DATAMATRIX);
    assert.equal(isDataMatrix({ barcodeType: 'dm' }), true);
  });
});
