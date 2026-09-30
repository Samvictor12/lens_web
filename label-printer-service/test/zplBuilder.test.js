const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildFgLabelZpl } = require('../src/zplBuilder');

describe('buildFgLabelZpl', () => {
  it('includes QR command and value', () => {
    const zpl = buildFgLabelZpl('PCB123/09092026');
    assert.match(zpl, /\^BQ/);
    assert.match(zpl, /PCB123\/09092026/);
    assert.match(zpl, /\^PW80/);
    assert.match(zpl, /\^LL80/);
    assert.match(zpl, /\^FO8,8/);
    assert.match(zpl, /\^XA/);
    assert.match(zpl, /\^XZ/);
  });

  it('emits Data Matrix ^BX when barcodeType is datamatrix', () => {
    const zpl = buildFgLabelZpl('PCB123/09092026', { barcodeType: 'datamatrix' });
    assert.match(zpl, /\^BXN,2,200/);
    assert.match(zpl, /\^FDPCB123\/09092026\^FS/);
    assert.doesNotMatch(zpl, /\^BQ/);
  });

  it('throws on empty value', () => {
    assert.throws(() => buildFgLabelZpl(''), /required/i);
    assert.throws(() => buildFgLabelZpl('   '), /required/i);
    assert.throws(() => buildFgLabelZpl(null), /required/i);
  });
});
