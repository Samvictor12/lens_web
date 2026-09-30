const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Generates temporary QR code PNG buffer for the card.
 */
async function generateQrBuffer(text) {
  if (!text) return null;
  return QRCode.toBuffer(String(text), {
    type: 'png',
    margin: 0,
    errorCorrectionLevel: 'M',
  });
}

/**
 * Normalized DC Customer Card payload generator and GDI rendering payload.
 */
async function prepareCustomerCardJob(payload) {
  const orderNo = payload.orderNo || '';
  const qrBuffer = await generateQrBuffer(orderNo);
  let qrPath = '';
  if (qrBuffer) {
    qrPath = path.join(os.tmpdir(), `mes-qr-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
    fs.writeFileSync(qrPath, qrBuffer);
  }

  const lensLine = String(payload.lensLine || payload.productLine || 'Lens name: -');
  const coating = String(payload.coating || '-');
  const category = String(payload.category || payload.categoryName || '-');
  const customerName = String(payload.customerName || '-');
  const ptName = String(payload.ptName || '-');
  const custRef = String(payload.customerRefNo || '-');
  const orderDate = String(payload.orderDate || '-');
  const showAdd = Boolean(payload.showAdd);
  const eyes = Array.isArray(payload.eyes) ? payload.eyes : [];

  const headers = ['', 'sph', 'cyl', 'Ax', ...(showAdd ? ['Add'] : []), 'FH'];
  const tableRows = [headers];

  for (const e of eyes) {
    const row = [
      String(e.eye || ''),
      String(e.sph ?? '-'),
      String(e.cyl ?? '-'),
      String(e.axis ?? '-'),
    ];
    if (showAdd) {
      row.push(String(e.add ?? '-'));
    }
    row.push(String(e.fh ?? e.dia ?? '-'));
    tableRows.push(row);
  }

  return {
    docType: 'AUTHENTICITY_CARD',
    widthMm: 84,
    heightMm: 55,
    topGapMm: 7,
    lensLine,
    coating,
    category,
    customerName,
    ptName,
    custRef,
    orderDate,
    showAdd,
    tableRows,
    qrPath,
    cleanup: () => {
      if (qrPath) {
        try { fs.unlinkSync(qrPath); } catch (_) {}
      }
    },
  };
}

module.exports = {
  prepareCustomerCardJob,
};
