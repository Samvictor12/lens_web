const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { getAppDir } = require('./settingsStore');

function appendStartupLog(msg, extra) {
  try {
    const logDir = path.join(getAppDir(), 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    const line = `${new Date().toISOString()} ${msg}${extra ? ` ${JSON.stringify(extra)}` : ''}\n`;
    fs.appendFileSync(path.join(logDir, 'printer.log'), line);
  } catch (_) {
    /* ignore */
  }
}

function formatStartupError(err) {
  if (err && err.code === 'EADDRINUSE') {
    return (
      'Port is already in use. Another MES-Printer (or app) is listening on that port.\n' +
      'Close the other MES-Printer.exe in Task Manager, then try again.'
    );
  }
  return (err && err.message) || String(err);
}

/**
 * Keep the console open after a fatal error so double-click launches do not flash-close.
 */
function pauseBeforeExit(exitCode = 1) {
  return new Promise((resolve) => {
    const finish = () => resolve(exitCode);
    if (process.stdin.isTTY && process.stdout.isTTY) {
      console.error('');
      console.error('Press Enter to close…');
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      rl.question('', () => {
        rl.close();
        finish();
      });
      return;
    }
    setTimeout(finish, 15000);
  });
}

async function fatalExit(err) {
  const message = formatStartupError(err);
  appendStartupLog('[FATAL] Failed to start', {
    message,
    code: err && err.code,
    stack: err && err.stack,
  });
  console.error('');
  console.error('[FATAL] Failed to start MES Label Printer');
  console.error(message);
  console.error(`Details also in: ${path.join(getAppDir(), 'logs', 'printer.log')}`);
  const code = await pauseBeforeExit(1);
  process.exit(code);
}

module.exports = {
  appendStartupLog,
  formatStartupError,
  pauseBeforeExit,
  fatalExit,
};
