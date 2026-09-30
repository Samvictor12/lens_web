const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * Lists installed Windows printers. Returns [] on non-Windows or on failure.
 */
async function listPrinters() {
  if (process.platform !== 'win32') {
    return [];
  }

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        'Get-Printer | Select-Object -ExpandProperty Name',
      ],
      { windowsHide: true, timeout: 15000 },
    );
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (err) {
    try {
      const { stdout } = await execFileAsync(
        'wmic',
        ['printer', 'get', 'name'],
        { windowsHide: true, timeout: 15000 },
      );
      return stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && line.toLowerCase() !== 'name');
    } catch (wmicErr) {
      return [];
    }
  }
}

module.exports = { listPrinters };
