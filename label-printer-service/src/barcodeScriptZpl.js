/**
 * Size-aware ZPL for barcode_script RAW path.
 * Magnification kept one step smaller so codes fit inside the sticker
 * (previous BQM/BX values printed slightly oversized on all 3 stocks).
 */
const { isDataMatrix } = require('./barcodeType');

function escapeZplFd(value) {
  return String(value ?? '')
    .replace(/\^/g, ' ')
    .replace(/~/g, ' ')
    .replace(/_/g, ' ');
}

function normalizeLabelSize(options = {}) {
  const size = String(options.labelSize || '').toLowerCase().replace(/\s+/g, '');
  if (size === '13x13' || size === '13*13' || size === '13' || size === 'square' || size === '4') {
    return '13x13';
  }
  if (size === '10x10' || size === '10*10' || size === 'micro' || size === '3') {
    return '10x10';
  }
  if (
    size === '10x12.5' ||
    size === '12.5x10' ||
    size === '10*12.5' ||
    size === '12.5*10' ||
    size === 'small' ||
    size === '2'
  ) {
    return '10x12.5';
  }
  return '10x25';
}

/**
 * @param {string} value FG code from Assembly
 * @param {{ barcodeType?: string, labelSize?: string, includeText?: boolean, topLabel?: string, bottomLabel?: string }} [options]
 */
function buildBarcodeScriptZpl(value, options = {}) {
  const fgValue = escapeZplFd(String(value ?? '').trim());
  if (!fgValue) {
    throw new Error('Print value is required');
  }

  const includeText = Boolean(options.includeText);
  const topText =
    options.topLabel !== undefined && options.topLabel !== null
      ? escapeZplFd(String(options.topLabel))
      : '';
  const bottomText =
    options.bottomLabel !== undefined && options.bottomLabel !== null
      ? escapeZplFd(String(options.bottomLabel))
      : fgValue;

  const size = normalizeLabelSize(options);

  if (size === '13x13') {
    // 13×13 mm square label (PW154×LL154 @ 300 dpi / PW104×LL104 @ 203 dpi)
    // Centered Data Matrix / QR with balanced margins
    if (!includeText) {
      const codeBlock = isDataMatrix(options)
        ? ['^FO38,36', `^BXN,4,200^FD${fgValue}^FS`]
        : ['^FO36,34', `^BQM,3^FDMA,${fgValue}^FS`];

      return [
        '^XA',
        '^SZ2^JMA',
        '^MCY^PMN',
        '^PW154',
        '^LL154',
        '^JZY',
        '^LH0,0^LRN',
        '^XZ',
        '^XA',
        ...codeBlock,
        '^PQ1,0,1,Y',
        '^XZ',
      ].join('\n');
    }

    const codeBlock = isDataMatrix(options)
      ? ['^FO38,30', `^BXN,3,200^FD${fgValue}^FS`]
      : ['^FO36,28', `^BQM,2^FDMA,${fgValue}^FS`];

    return [
      '^XA',
      '^SZ2^JMA',
      '^MCY^PMN',
      '^PW154',
      '^LL154',
      '^JZY',
      '^LH0,0^LRN',
      '^XZ',
      '^XA',
      topText ? `^FT8,18^CI0^A0N,15,11^FD${topText}^FS` : '',
      ...codeBlock,
      '^FT8,142',
      `^A0N,15,11^FD${bottomText}^FS`,
      '^PQ1,0,1,Y',
      '^XZ',
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (size === '10x10') {
    // 10×10 mm @ 203 dpi → 80×80 dots. Mag 1 / module 2 (was 2 / 3 — too big).
    if (!includeText) {
      const codeBlock = isDataMatrix(options)
        ? ['^FO22,22', `^BXN,2,200^FD${fgValue}^FS`]
        : ['^FO22,22', `^BQM,1^FDMA,${fgValue}^FS`];

      return [
        '^XA',
        '^SZ2^JMA',
        '^MCY^PMN',
        '^PW80',
        '^LL80',
        '^JZY',
        '^LH0,0^LRN',
        '^XZ',
        '^XA',
        ...codeBlock,
        '^PQ1,0,1,Y',
        '^XZ',
      ].join('\n');
    }

    const codeBlock = isDataMatrix(options)
      ? ['^FO22,8', `^BXN,2,200^FD${fgValue}^FS`]
      : ['^FO22,8', `^BQM,1^FDMA,${fgValue}^FS`];

    return [
      '^XA',
      '^SZ2^JMA',
      '^MCY^PMN',
      '^PW80',
      '^LL80',
      '^JZY',
      '^LH0,0^LRN',
      '^XZ',
      '^XA',
      ...codeBlock,
      '^FT4,72',
      `^A0N,10,7^FD${bottomText}^FS`,
      '^PQ1,0,1,Y',
      '^XZ',
    ].join('\n');
  }

  if (size === '10x12.5') {
    // 12.5×10 mm printable (PW100×LL80). Mag 2 / module 3 (was 3 / 4).
    if (!includeText) {
      const codeBlock = isDataMatrix(options)
        ? ['^FO28,18', `^BXN,3,200^FD${fgValue}^FS`]
        : ['^FO26,16', `^BQM,2^FDMA,${fgValue}^FS`];

      return [
        '^XA',
        '^SZ2^JMA',
        '^MCY^PMN',
        '^PW100',
        '^LL80',
        '^JZY',
        '^LH0,0^LRN',
        '^XZ',
        '^XA',
        ...codeBlock,
        '^PQ1,0,1,Y',
        '^XZ',
      ].join('\n');
    }

    const codeBlock = isDataMatrix(options)
      ? ['^FO22,12', `^BXN,2,200^FD${fgValue}^FS`]
      : ['^FO20,12', `^BQM,2^FDMA,${fgValue}^FS`];

    return [
      '^XA',
      '^SZ2^JMA',
      '^MCY^PMN',
      '^PW100',
      '^LL80',
      '^JZY',
      '^LH0,0^LRN',
      '^XZ',
      '^XA',
      topText ? `^FT4,11^CI0^A0N,11,9^FD${topText}^FS` : '',
      ...codeBlock,
      '^FT4,72',
      `^A0N,12,8^FD${bottomText}^FS`,
      '^PQ1,0,1,Y',
      '^XZ',
    ]
      .filter(Boolean)
      .join('\n');
  }

  // Standard ~10×25 / ^PW180 (barcode_script). Mag 2 / module 3 (was 3 / 4).
  if (!includeText) {
    const codeBlock = isDataMatrix(options)
      ? ['^FO68,18', `^BXN,3,200^FD${fgValue}^FS`]
      : ['^FO62,16', `^BQM,2^FDMA,${fgValue}^FS`];

    return [
      '^XA',
      '^SZ2^JMA',
      '^MCY^PMN',
      '^PW180',
      '^JZY',
      '^LH0,0^LRN',
      '^XZ',
      '^XA',
      ...codeBlock,
      '^PQ1,0,1,Y',
      '^XZ',
    ].join('\n');
  }

  // With text — same frame as Python, slightly smaller code
  const codeBlock = isDataMatrix(options)
    ? ['^FO14,36', `^BXN,3,200^FD${fgValue}^FS`]
    : ['^FO14,36', `^BQM,2^FDMA,${fgValue}^FS`];

  return [
    '^XA',
    '^SZ2^JMA',
    '^MCY^PMN',
    '^PW180',
    '^JZY',
    '^LH0,0^LRN',
    '^XZ',
    '^XA',
    '^FT4,17',
    '^CI0',
    `^A0N,20,13^FD${topText}^FS`,
    ...codeBlock,
    '^FT10,145',
    `^A0N,20,13^FD${bottomText}^FS`,
    '^PQ1,0,1,Y',
    '^XZ',
  ].join('\n');
}

module.exports = {
  buildBarcodeScriptZpl,
  normalizeLabelSize,
};
