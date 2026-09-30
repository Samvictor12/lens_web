const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const os = require('os');

async function generateQrBuffer(text) {
  if (!text) return null;
  return QRCode.toBuffer(String(text), {
    type: 'png',
    margin: 0,
    errorCorrectionLevel: 'M',
  });
}

/**
 * Normalized 75x50mm Barcode label payload generator and GDI/TSPL rendering job.
 */
async function prepareBarcodeLabelJob(payload, widthMm = 75, heightMm = 50) {
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
  const custRef = String(payload.customerRefNo || '-');
  const orderDate = String(payload.orderDate || '-');
  const showAdd = Boolean(payload.showAdd);
  const eye = String(payload.eye || '').toUpperCase() || 'R';

  const row = payload.row || payload.activeRx || {};
  const dataRow = [
    String(row.eye || eye),
    String(row.sph ?? '-'),
    String(row.cyl ?? '-'),
    String(row.axis ?? '-'),
  ];
  if (showAdd) {
    dataRow.push(String(row.add ?? '-'));
  }
  dataRow.push(String(row.fh ?? row.dia ?? '-'));

  const headers = ['', 'sph', 'cyl', 'Ax', ...(showAdd ? ['Add'] : []), 'FH'];
  const tableRows = [headers, dataRow];

  return {
    docType: 'BARCODE_LABEL',
    widthMm,
    heightMm,
    topGapMm: 0,
    lensLine,
    coating,
    category,
    customerName,
    custRef,
    orderDate,
    showAdd,
    tableRows,
    qrPath,
    orderNo,
    cleanup: () => {
      if (qrPath) {
        try { fs.unlinkSync(qrPath); } catch (_) {}
      }
    },
  };
}

module.exports = {
  prepareBarcodeLabelJob,
};
