const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

console.log('Resetting Lens Print Service...');

// 1. Terminate running LensPrintService.exe if active on Windows
if (process.platform === 'win32') {
  try {
    console.log('Stopping running LensPrintService processes...');
    execSync('taskkill /F /IM LensPrintService.exe', { stdio: 'ignore' });
    console.log('Stopped active LensPrintService.');
  } catch (_) {
    // Process was not running
  }
}

// 2. Clean temporary files
const tmpDir = os.tmpdir();
try {
  const files = fs.readdirSync(tmpDir);
  let cleaned = 0;
  for (const f of files) {
    if (f.startsWith('lens-') || f.startsWith('mes-')) {
      try {
        fs.unlinkSync(path.join(tmpDir, f));
        cleaned++;
      } catch (_) {}
    }
  }
  console.log(`Cleaned ${cleaned} temporary print artifacts.`);
} catch (e) {
  console.error('Failed to clean temp artifacts:', e.message);
}

console.log('Reset completed successfully.');
