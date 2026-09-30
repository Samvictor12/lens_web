const http = require('http');
const fs = require('fs');
const path = require('path');
const { listPrinters } = require('./listPrinters');
const { printLabel } = require('./printLabel');
const { isWorkerReady, shutdownRawPrintWorker } = require('./windowsPrint');
const { getAppDir } = require('./settingsStore');

const DEFAULT_PRINT_TIMEOUT_MS = 8000;

function printerLog(msg, extra) {
  try {
    const logDir = path.join(getAppDir(), 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    const line = `${new Date().toISOString()} ${msg}${extra ? ` ${JSON.stringify(extra)}` : ''}\n`;
    fs.appendFileSync(path.join(logDir, 'printer.log'), line);
  } catch (_) {
    /* ignore */
  }
  console.log(msg, extra || '');
}

function sendJson(res, statusCode, body) {
  if (res.writableEnded) return;
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(payload);
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    timeout,
  ]);
}

function readJsonBody(req, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const timer = setTimeout(() => reject(new Error('Request body timed out')), timeoutMs);
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      clearTimeout(timer);
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function createServer(settings, deps = {}) {
  const printFn = deps.printLabelFn || printLabel;
  const listFn = deps.listPrintersFn || listPrinters;
  const printTimeoutMs =
    Number(deps.printTimeoutMs || process.env.MES_PRINT_TIMEOUT_MS) || DEFAULT_PRINT_TIMEOUT_MS;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${settings.port}`);

    if (req.method === 'OPTIONS') {
      sendJson(res, 200, { ok: true });
      return;
    }

    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        sendJson(res, 200, {
          ok: true,
          printerName: settings.printerName || null,
          printMode: settings.printMode || null,
          barcodeType: settings.barcodeType || null,
          port: settings.port,
          workerReady: isWorkerReady(),
        });
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/printers') {
        const printers = await listFn();
        sendJson(res, 200, { printers, status: 200 });
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/print/fg-label') {
        const body = await readJsonBody(req);
        const value = body.value ?? body.qrValue ?? body.printing_value;
        if (!String(value ?? '').trim()) {
          sendJson(res, 400, { status: 400, message: 'value is required' });
          return;
        }
        const started = Date.now();
        const printValue = String(value).trim().toUpperCase();
        const printSettings = {
          ...settings,
          labelSize: body.labelSize || settings.labelSize,
          includeText: body.includeText !== undefined ? Boolean(body.includeText) : Boolean(settings.includeText),
          topLabel: body.topLabel !== undefined ? body.topLabel : settings.topLabel,
          bottomLabel: body.bottomLabel !== undefined ? body.bottomLabel : settings.bottomLabel,
        };
        printerLog('PRINT start', {
          value: printValue,
          printMode: printSettings.printMode,
          barcodeType: printSettings.barcodeType,
          labelSize: printSettings.labelSize,
          includeText: printSettings.includeText,
          printerName: printSettings.printerName,
          workerReady: isWorkerReady(),
        });
        try {
          const result = await withTimeout(
            printFn(printValue, printSettings),
            printTimeoutMs,
            `Print timed out after ${printTimeoutMs}ms. Check printer is Ready (not Paused / Offline).`,
          );
          printerLog('PRINT done', { ms: Date.now() - started, method: result && result.method });
          sendJson(res, 200, {
            status: 200,
            message: 'Printed successfully',
            result: { ...result, ms: Date.now() - started },
          });
        } catch (err) {
          try {
            shutdownRawPrintWorker();
          } catch (_) {
            /* ignore */
          }
          printerLog('PRINT fail', { ms: Date.now() - started, message: err.message });
          sendJson(res, 500, {
            status: 500,
            message: err.message || 'Print failed',
            ms: Date.now() - started,
          });
        }
        return;
      }

      sendJson(res, 404, { status: 404, message: 'Not found' });
    } catch (err) {
      sendJson(res, 500, {
        status: 500,
        message: err.message || 'Print failed',
      });
    }
  });

  server.timeout = printTimeoutMs + 2000;
  server.headersTimeout = printTimeoutMs + 2000;
  server.requestTimeout = printTimeoutMs + 3000;

  return server;
}

function startServer(settings, deps = {}) {
  return new Promise((resolve, reject) => {
    const server = createServer(settings, deps);
    server.once('error', reject);
    server.listen(settings.port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

module.exports = {
  createServer,
  startServer,
  sendJson,
  readJsonBody,
  withTimeout,
  DEFAULT_PRINT_TIMEOUT_MS,
};
