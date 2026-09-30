const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildFgLabelTspl } = require('../src/tsplBuilder');

describe('buildFgLabelTspl', () => {
  it('emits native TSC TSPL QR (not ZPL)', () => {
    const out = buildFgLabelTspl('PCB-01/11092026');
    assert.match(out, /SIZE 10 mm,10 mm/);
    assert.match(out, /QRCODE /);
    assert.match(out, /PCB-01\/11092026/);
    assert.doesNotMatch(out, /\^XA/);
  });

  it('emits DMATRIX when barcodeType is datamatrix', () => {
    const out = buildFgLabelTspl('PCB-01', { barcodeType: 'datamatrix' });
    assert.match(out, /DMATRIX /);
    assert.doesNotMatch(out, /QRCODE /);
  });

  it('throws on empty value', () => {
    assert.throws(() => buildFgLabelTspl(''), /required/i);
  });
});
