const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Bundling LensPrintService.zip for distribution...');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.resolve(rootDir, '../public');
const stagingDir = path.join(rootDir, 'dist/LensPrintService');
const zipOutput = path.join(publicDir, 'LensPrintService.zip');

try {
  // 1. Prepare staging folder
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDir, { recursive: true });

  // 2. Copy compiled EXEs if present
  const exe1 = path.join(distDir, 'LensPrintService.exe');
  const exe2 = path.join(distDir, 'LensPrintService-Reset.exe');
  if (fs.existsSync(exe1)) fs.copyFileSync(exe1, path.join(stagingDir, 'LensPrintService.exe'));
  if (fs.existsSync(exe2)) fs.copyFileSync(exe2, path.join(stagingDir, 'LensPrintService-Reset.exe'));

  // 3. Copy run_silent.vbs
  const vbs = path.join(rootDir, 'run_silent.vbs');
  if (fs.existsSync(vbs)) fs.copyFileSync(vbs, path.join(stagingDir, 'run_silent.vbs'));

  // 4. Create README.txt
  const readmeContent = `=====================================================
Lens Print Service - Installation Instructions
=====================================================

1. Double-click "run_silent.vbs" to start the printer service silently in the background.
2. The service runs on port 9333 and connects with Lens Web.

Automatic Windows Startup (Recommended):
- Press Win + R on your keyboard.
- Type "shell:startup" and press Enter.
- Create a shortcut to "run_silent.vbs" and paste it into the Startup folder.

Resetting / Troubleshooting:
- If you need to reset settings or clear cache, run "LensPrintService-Reset.exe".
`;
  fs.writeFileSync(path.join(stagingDir, 'README.txt'), readmeContent, 'utf8');

  // 5. Create ZIP using zip command or powershell
  if (process.platform === 'win32') {
    execSync(`powershell -command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipOutput}' -Force"`);
  } else {
    execSync(`cd "${stagingDir}" && zip -r "${zipOutput}" .`);
  }

  console.log(`Successfully created: ${zipOutput}`);
} catch (err) {
  console.error('Failed to bundle ZIP:', err.message);
} finally {
  try {
    if (fs.existsSync(stagingDir)) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }
  } catch (_) {}
}
