/**
 * TSC TSPL for a 10mm × 10mm label @ 203 dpi.
 */
const { isDataMatrix } = require('./barcodeType');
const {
  LABEL_WIDTH_MM,
  LABEL_HEIGHT_MM,
  CODE_PX,
  CODE_OFFSET_X,
  CODE_OFFSET_Y,
} = require('./labelLayout');

const QR_CELL = 2;
const GAP_MM = require('./labelLayout').LABEL_GAP_MM;

function escapeTsplData(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, "'");
}

function buildFgLabelTspl(value, options = {}) {
  const text = String(value ?? '').trim();
  if (!text) {
    throw new Error('Print value is required');
  }
  const data = escapeTsplData(text);
  const codeCmd = isDataMatrix(options)
    ? `DMATRIX ${CODE_OFFSET_X},${CODE_OFFSET_Y},${CODE_PX},${CODE_PX},x3,y3,"${data}"`
    : `QRCODE ${CODE_OFFSET_X},${CODE_OFFSET_Y},M,${QR_CELL},A,0,"${data}"`;

  return [
    `SIZE ${LABEL_WIDTH_MM} mm,${LABEL_HEIGHT_MM} mm`,
    `GAP ${GAP_MM} mm,0`,
    'DIRECTION 1',
    'REFERENCE 0,0',
    'CLS',
    codeCmd,
    'PRINT 1,1',
  ].join('\r\n');
}

module.exports = {
  buildFgLabelTspl,
  escapeTsplData,
  LABEL_MM: LABEL_WIDTH_MM,
  LABEL_WIDTH_MM,
  LABEL_HEIGHT_MM,
  LABEL_DOTS: require('./labelLayout').LABEL_WIDTH_PX,
  CODE_DOTS: CODE_PX,
  CODE_OFFSET: CODE_OFFSET_X,
  QR_CELL,
  GAP_MM,
};
