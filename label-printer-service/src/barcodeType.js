const BARCODE_TYPES = {
  QR: 'qr',
  DATAMATRIX: 'datamatrix',
};

function resolveBarcodeType(input) {
  const raw =
    input && typeof input === 'object'
      ? String(input.barcodeType ?? input.symbology ?? '')
      : String(input ?? '');
  const v = raw.trim().toLowerCase();
  if (
    v === 'datamatrix' ||
    v === 'data-matrix' ||
    v === 'data_matrix' ||
    v === 'dm' ||
    v === '2'
  ) {
    return BARCODE_TYPES.DATAMATRIX;
  }
  return BARCODE_TYPES.QR;
}

function isDataMatrix(input) {
  return resolveBarcodeType(input) === BARCODE_TYPES.DATAMATRIX;
}

module.exports = {
  BARCODE_TYPES,
  resolveBarcodeType,
  isDataMatrix,
};
