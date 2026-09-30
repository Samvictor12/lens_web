const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildFgLabelPng,
  withDpi,
  LABEL_WIDTH_PX,
  LABEL_HEIGHT_PX,
  CODE_PX,
  LABEL_DPI,
} = require('../src/imageBuilder');
const { PNG } = require('pngjs');

describe('buildFgLabelPng', () => {
  it('returns non-empty PNG buffer', async () => {
    const buf = await buildFgLabelPng('PCB123/09092026');
    assert.ok(Buffer.isBuffer(buf));
    assert.ok(buf.length > 100);
    assert.equal(buf[0], 0x89);
    assert.equal(buf[1], 0x50);
    assert.equal(buf[2], 0x4e);
    assert.equal(buf[3], 0x47);
  });

  it('uses 10×10 mm label @ 203dpi', () => {
    assert.equal(LABEL_WIDTH_PX, 80);
    assert.equal(LABEL_HEIGHT_PX, 80);
    assert.ok(CODE_PX <= LABEL_HEIGHT_PX);
    assert.equal(LABEL_DPI, 203);
  });

  it('PNG pixel size is 10×10 mm', async () => {
    const buf = await buildFgLabelPng('PCB123/09092026');
    const png = PNG.sync.read(buf);
    assert.equal(png.width, LABEL_WIDTH_PX);
    assert.equal(png.height, LABEL_HEIGHT_PX);
  });

  it('throws on empty value', async () => {
    await assert.rejects(() => buildFgLabelPng(''), /required/i);
  });

  it('builds Data Matrix PNG on 10×10 mm label', async () => {
    const buf = await buildFgLabelPng('PCB123/09092026', { barcodeType: 'datamatrix' });
    assert.ok(Buffer.isBuffer(buf));
    const png = PNG.sync.read(buf);
    assert.equal(png.width, 80);
    assert.equal(png.height, 80);
  });

  it('embeds 203 dpi pHYs for GDI sizing', async () => {
    const buf = await buildFgLabelPng('PCB123/09092026');
    assert.ok(buf.includes(Buffer.from('pHYs')));
    const again = withDpi(buf);
    assert.equal(again.includes(Buffer.from('pHYs')), true);
  });
});
