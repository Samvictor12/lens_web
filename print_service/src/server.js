const http = require('http');
const { listPrinters, sendRawBytes, printGdiDocument } = require('./windowsPrint');
const { buildJobCardTspl } = require('./templates/jobCard');
const { prepareBarcodeLabelJob } = require('./templates/barcodeLabel');
const { prepareCustomerCardJob } = require('./templates/customerCard');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res, statusCode, data) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 5 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function createServer(port = 9333) {
  const server = http.createServer(async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://localhost:${port}`);
    const pathname = url.pathname;

    try {
      // ── GET /health ──
      if (req.method === 'GET' && pathname === '/health') {
        return sendJson(res, 200, {
          status: 'ok',
          service: 'LensPrintService',
          version: '1.0.0',
          port,
        });
      }

      // ── GET /api/printers ──
      if (req.method === 'GET' && pathname === '/api/printers') {
        const { printers, details } = await listPrinters();
        return sendJson(res, 200, { printers, details, status: 200 });
      }

      // ── POST /api/print/document ──
      if (req.method === 'POST' && pathname === '/api/print/document') {
        const body = await parseJsonBody(req);
        const printerName = body.printerName;
        const printType = body.printType;
        const payload = body.payload || {};

        if (!printerName) {
          return sendJson(res, 400, { message: 'printerName is required', status: 400 });
        }

        if (printType === 'JOB_CARD') {
          const tspl = buildJobCardTspl(
            payload.orderNo || payload.qrValue || '',
            payload.customerRefNo || '-',
            payload.orderDate || ''
          );
          await sendRawBytes(printerName, tspl, 'Job-Card');
          return sendJson(res, 200, { message: 'Job Card printed', status: 200 });
        }

        if (printType === 'BARCODE_LABEL') {
          const job = await prepareBarcodeLabelJob(payload);
          try {
            await printGdiDocument(printerName, job, 'Barcode-Label');
          } finally {
            job.cleanup();
          }
          return sendJson(res, 200, { message: 'Barcode label printed', status: 200 });
        }

        if (printType === 'AUTHENTICITY_CARD' || printType === 'LENS_SPECIFICATION') {
          const job = await prepareCustomerCardJob(payload);
          try {
            await printGdiDocument(printerName, job, 'DC-Customer-Card');
          } finally {
            job.cleanup();
          }
          return sendJson(res, 200, { message: 'DC Customer Card printed', status: 200 });
        }

        return sendJson(res, 400, { message: `Unsupported printType: ${printType}`, status: 400 });
      }

      // ── POST /api/printers/test-print ──
      if (req.method === 'POST' && pathname === '/api/printers/test-print') {
        const body = await parseJsonBody(req);
        const printerName = body.printerName;
        const printType = body.printType || 'BARCODE_LABEL';

        if (!printerName) {
          return sendJson(res, 400, { message: 'printerName is required', status: 400 });
        }

        const dummyPayload = {
          orderNo: 'SO-TEST-001',
          lensLine: 'Lens name: TEST LENS 1.56',
          coating: 'Hard Coat',
          category: 'Single Vision',
          customerName: 'Test Customer',
          ptName: 'Test Pt',
          customerRefNo: 'REF-001',
          orderDate: new Date().toLocaleDateString('en-GB'),
          showAdd: false,
          eyes: [{ eye: 'R', sph: '-1.00', cyl: '0.00', axis: '0', add: '0.00', fh: '70' }],
        };

        if (printType === 'JOB_CARD') {
          const tspl = buildJobCardTspl('TEST-JOB-001', 'REF-TEST', '29/09/2026');
          await sendRawBytes(printerName, tspl, 'Test-JobCard');
        } else if (printType === 'AUTHENTICITY_CARD' || printType === 'LENS_SPECIFICATION') {
          const job = await prepareCustomerCardJob(dummyPayload);
          try {
            await printGdiDocument(printerName, job, 'Test-Customer-Card');
          } finally {
            job.cleanup();
          }
        } else {
          const job = await prepareBarcodeLabelJob(dummyPayload);
          try {
            await printGdiDocument(printerName, job, 'Test-Barcode');
          } finally {
            job.cleanup();
          }
        }

        return sendJson(res, 200, { message: `Test print sent to ${printerName}`, status: 200 });
      }

      // ── POST /api/barcode/generateAndPrintBulk ──
      if (req.method === 'POST' && pathname === '/api/barcode/generateAndPrintBulk') {
        const body = await parseJsonBody(req);
        const printerName = (body.printerName && (body.printerName.Printer_name || body.printerName)) || '';
        if (!printerName) {
          return sendJson(res, 400, { message: 'printerName is required', status: 400 });
        }

        const serials = Array.isArray(body.barcodeSerial) ? body.barcodeSerial : [body.barcodeSerial || ''];
        for (const s of serials) {
          const tspl = buildJobCardTspl(s, body.topLabel || '-', new Date().toLocaleDateString('en-GB'));
          await sendRawBytes(printerName, tspl, 'Bulk-Barcode');
        }
        return sendJson(res, 200, { message: 'Bulk barcodes printed', status: 200 });
      }

      return sendJson(res, 404, { message: 'Not Found', status: 404 });
    } catch (err) {
      console.error(`[LensPrintService] Error handling ${pathname}:`, err.message);
      return sendJson(res, 500, { message: err.message || 'Internal Server Error', status: 500 });
    }
  });

  return server;
}

module.exports = {
  createServer,
};
