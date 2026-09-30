const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildBarcodeScriptZpl } = require('../src/barcodeScriptZpl');

describe('buildBarcodeScriptZpl', () => {
  it('prints Code-Only QR by default (no text labels)', () => {
    const fg = 'PCB123/09092026';
    const zpl = buildBarcodeScriptZpl(fg);
    assert.match(zpl, /\^PW180/);
    assert.match(zpl, /\^BQM,2\^FDMA,PCB123\/09092026\^FS/);
    assert.doesNotMatch(zpl, /\^A0N/);
    assert.doesNotMatch(zpl, /\^BX/);
  });

  it('prints Code-Only Data Matrix when selected', () => {
    const fg = 'PCB123/09092026';
    const zpl = buildBarcodeScriptZpl(fg, { barcodeType: 'datamatrix' });
    assert.match(zpl, /\^BXN,3,200/);
    assert.match(zpl, /\^FDPCB123\/09092026\^FS/);
    assert.doesNotMatch(zpl, /\^A0N/);
    assert.doesNotMatch(zpl, /\^BQM/);
    assert.doesNotMatch(zpl, /MA,/);
  });

  it('supports custom topLabel and bottomLabel when includeText is true', () => {
    const fg = 'PCB123';
    const zpl = buildBarcodeScriptZpl(fg, {
      includeText: true,
      topLabel: 'TOP-HEADER',
      bottomLabel: 'BOTTOM-SERIAL',
    });
    assert.match(zpl, /\^A0N,20,13\^FDTOP-HEADER\^FS/);
    assert.match(zpl, /\^A0N,20,13\^FDBOTTOM-SERIAL\^FS/);
    assert.match(zpl, /\^BQM,2\^FDMA,PCB123\^FS/);
  });

  it('supports 10x12.5 small label Code-Only formatting', () => {
    const fg = 'PCB123';
    const zpl = buildBarcodeScriptZpl(fg, { labelSize: '10x12.5' });
    assert.match(zpl, /\^PW100/);
    assert.match(zpl, /\^LL80/);
    assert.match(zpl, /\^BQM,2\^FDMA,PCB123\^FS/);
    assert.doesNotMatch(zpl, /\^A0N/);
  });

  it('supports 10x10 micro label Code-Only formatting (smaller mag)', () => {
    const fg = 'PCB123';
    const zpl = buildBarcodeScriptZpl(fg, { labelSize: '10x10' });
    assert.match(zpl, /\^PW80/);
    assert.match(zpl, /\^LL80/);
    assert.match(zpl, /\^BQM,1\^FDMA,PCB123\^FS/);
    assert.doesNotMatch(zpl, /\^A0N/);
  });

  it('supports 13x13 square label Code-Only formatting for Data Matrix & QR', () => {
    const fg = 'PCB123';
    const dmZpl = buildBarcodeScriptZpl(fg, { labelSize: '13x13', barcodeType: 'datamatrix' });
    assert.match(dmZpl, /\^PW154/);
    assert.match(dmZpl, /\^LL154/);
    assert.match(dmZpl, /\^FO38,36/);
    assert.match(dmZpl, /\^BXN,4,200/);
    assert.doesNotMatch(dmZpl, /\^A0N/);

    const qrZpl = buildBarcodeScriptZpl(fg, { labelSize: '13x13', barcodeType: 'qr' });
    assert.match(qrZpl, /\^PW154/);
    assert.match(qrZpl, /\^LL154/);
    assert.match(qrZpl, /\^FO36,34/);
    assert.match(qrZpl, /\^BQM,3/);
    assert.doesNotMatch(qrZpl, /\^A0N/);
  });

  it('throws on empty value', () => {
    assert.throws(() => buildBarcodeScriptZpl(''), /required/i);
  });
});
