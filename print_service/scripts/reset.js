const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('Resetting Lens Print Service temporary files and cache...');

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
