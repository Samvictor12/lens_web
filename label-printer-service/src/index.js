const fs = require('fs');
const path = require('path');
const { ensureSettings, DEFAULT_PORT } = require('./promptSettings');
const { getAppDir } = require('./settingsStore');
const { startServer } = require('./server');
const { warmupRawPrintWorker, shutdownRawPrintWorker, isWorkerReady } = require('./windowsPrint');
const { fatalExit } = require('./startupFatal');

async function main() {
  const settings = await ensureSettings();
  const port = Number(settings.port) || DEFAULT_PORT;
  settings.port = port;

  const logDir = path.join(getAppDir(), 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, 'printer.log');

  const log = (msg, extra) => {
    const line = `${new Date().toISOString()} ${msg}${extra ? ` ${JSON.stringify(extra)}` : ''}\n`;
    try {
      fs.appendFileSync(logFile, line);
    } catch (_) {
      /* ignore */
    }
    console.log(msg, extra || '');
  };

  process.on('uncaughtException', (err) => {
    log('[FATAL] uncaughtException', { message: err.message, stack: err.stack });
  });
  process.on('unhandledRejection', (reason) => {
    log('[FATAL] unhandledRejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });

  // Listen first so a slow/failed worker never blocks the HTTP service from starting.
  const server = await startServer(settings);
  log(`MES Label Printer listening on http://127.0.0.1:${port}`, {
    printerName: settings.printerName,
    printMode: settings.printMode,
    barcodeType: settings.barcodeType,
    workerReady: isWorkerReady(),
  });

  // Warm only what this print mode needs (mode 4 must not start GDI — offline risk).
  warmupRawPrintWorker(settings)
    .then(() => log('Print worker warmup done', { printMode: settings.printMode }))
    .catch((err) =>
      log('Print worker warmup failed — first print may use oneshot', { message: err.message }),
    );

  const shutdown = () => {
    log('Shutting down');
    shutdownRawPrintWorker();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  fatalExit(err);
});
