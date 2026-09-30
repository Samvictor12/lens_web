const QRCode = require('qrcode');
const { PNG } = require('pngjs');
const { isDataMatrix } = require('./barcodeType');
const {
  LABEL_DPI,
  LABEL_WIDTH_PX,
  LABEL_HEIGHT_PX,
  CODE_PX,
  CODE_OFFSET_X,
  CODE_OFFSET_Y,
} = require('./labelLayout');

function blankLabel() {
  const label = new PNG({ width: LABEL_WIDTH_PX, height: LABEL_HEIGHT_PX, fill: true });
  for (let i = 0; i < label.data.length; i += 4) {
    label.data[i] = 255;
    label.data[i + 1] = 255;
    label.data[i + 2] = 255;
    label.data[i + 3] = 255;
  }
  return label;
}

/**
 * Embed pHYs so Windows GDI treats the bitmap as 203 dpi (not 96 dpi).
 */
function withDpi(pngBuffer, dpi = LABEL_DPI) {
  const buf = Buffer.isBuffer(pngBuffer) ? pngBuffer : Buffer.from(pngBuffer);
  if (buf.includes(Buffer.from('pHYs'))) return buf;
  const ppm = Math.round(dpi * (100 / 2.54));
  const chunkData = Buffer.alloc(9);
  chunkData.writeUInt32BE(ppm, 0);
  chunkData.writeUInt32BE(ppm, 4);
  chunkData[8] = 1;
  const type = Buffer.from('pHYs');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(9, 0);
  const crcBuf = Buffer.concat([type, chunkData]);
  let c = 0xffffffff;
  for (let i = 0; i < crcBuf.length; i += 1) {
    c ^= crcBuf[i];
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
  }
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE((c ^ 0xffffffff) >>> 0, 0);
  const phys = Buffer.concat([len, type, chunkData, crc]);
  const ihdrEnd = 8 + 4 + 4 + 13 + 4;
  if (buf.length < ihdrEnd || buf.toString('ascii', 12, 16) !== 'IHDR') {
    return buf;
  }
  return Buffer.concat([buf.subarray(0, ihdrEnd), phys, buf.subarray(ihdrEnd)]);
}

function centerOnLabel(srcPng) {
  const label = blankLabel();
  const w = Math.min(srcPng.width, CODE_PX, LABEL_WIDTH_PX);
  const h = Math.min(srcPng.height, CODE_PX, LABEL_HEIGHT_PX);
  const ox = Math.floor((LABEL_WIDTH_PX - w) / 2);
  const oy = Math.floor((LABEL_HEIGHT_PX - h) / 2);
  PNG.bitblt(srcPng, label, 0, 0, w, h, ox, oy);
  return withDpi(PNG.sync.write(label));
}

function scaleToBox(srcPng, box) {
  const maxDim = Math.max(srcPng.width, srcPng.height, 1);
  const scale = box / maxDim;
  const tw = Math.max(1, Math.round(srcPng.width * scale));
  const th = Math.max(1, Math.round(srcPng.height * scale));
  const out = new PNG({ width: box, height: box, fill: true });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 255;
    out.data[i + 1] = 255;
    out.data[i + 2] = 255;
    out.data[i + 3] = 255;
  }
  const ox = Math.floor((box - tw) / 2);
  const oy = Math.floor((box - th) / 2);
  for (let y = 0; y < th; y += 1) {
    const sy = Math.min(srcPng.height - 1, Math.floor(y / scale));
    for (let x = 0; x < tw; x += 1) {
      const sx = Math.min(srcPng.width - 1, Math.floor(x / scale));
      const si = (srcPng.width * sy + sx) << 2;
      const di = (box * (oy + y) + (ox + x)) << 2;
      out.data[di] = srcPng.data[si];
      out.data[di + 1] = srcPng.data[si + 1];
      out.data[di + 2] = srcPng.data[si + 2];
      out.data[di + 3] = srcPng.data[si + 3];
    }
  }
  return out;
}

async function buildDataMatrixPng(text) {
  const bwipjs = require('bwip-js');
  const buf = await bwipjs.toBuffer({
    bcid: 'datamatrix',
    text,
    scale: 3,
    padding: 0,
    backgroundcolor: 'FFFFFF',
  });
  return scaleToBox(PNG.sync.read(buf), CODE_PX);
}

/**
 * Build a PNG for a 10×10 mm label with a centered QR / Data Matrix.
 * @returns {Promise<Buffer>}
 */
async function buildFgLabelPng(value, options = {}) {
  const text = String(value ?? '').trim();
  if (!text) {
    throw new Error('Print value is required');
  }

  if (isDataMatrix(options)) {
    return centerOnLabel(await buildDataMatrixPng(text));
  }

  const qrBuf = await QRCode.toBuffer(text, {
    type: 'png',
    width: CODE_PX,
    margin: 0,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  return centerOnLabel(PNG.sync.read(qrBuf));
}

module.exports = {
  buildFgLabelPng,
  withDpi,
  LABEL_PX: LABEL_WIDTH_PX,
  LABEL_WIDTH_PX,
  LABEL_HEIGHT_PX,
  QR_PX: CODE_PX,
  CODE_PX,
  QR_OFFSET: CODE_OFFSET_X,
  CODE_OFFSET_X,
  CODE_OFFSET_Y,
  LABEL_DPI,
};
