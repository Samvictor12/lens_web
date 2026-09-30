/**
 * 10mm × 8mm label with a centered QR / Data Matrix @ 203 dpi.
 */
const { isDataMatrix } = require('./barcodeType');
const {
  LABEL_WIDTH_PX,
  LABEL_HEIGHT_PX,
  CODE_OFFSET_X,
  CODE_OFFSET_Y,
} = require('./labelLayout');

function buildFgLabelZpl(value, options = {}) {
  const text = String(value ?? '').trim();
  if (!text) {
    throw new Error('Print value is required');
  }

  const safe = text.replace(/\^/g, ' ').replace(/~/g, ' ');
  const codeCmds = isDataMatrix(options)
    ? ['^BXN,2,200', `^FD${safe}^FS`]
    : ['^BQN,2,2', `^FDLA,${safe}^FS`];

  return [
    '^XA',
    `^PW${LABEL_WIDTH_PX}`,
    `^LL${LABEL_HEIGHT_PX}`,
    '^LH0,0',
    `^FO${CODE_OFFSET_X},${CODE_OFFSET_Y}`,
    ...codeCmds,
    '^XZ',
  ].join('\n');
}

module.exports = {
  buildFgLabelZpl,
  LABEL_DOTS: LABEL_WIDTH_PX,
  LABEL_WIDTH_PX,
  LABEL_HEIGHT_PX,
  QR_DOTS: Math.min(LABEL_WIDTH_PX, LABEL_HEIGHT_PX),
  QR_OFFSET: CODE_OFFSET_X,
};
