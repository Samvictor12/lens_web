const readline = require('readline');
const { getSettingsPath, loadSettings, clearSettings } = require('../src/settingsStore');
const fs = require('fs');

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  const settingsPath = getSettingsPath();

  if (!fs.existsSync(settingsPath)) {
    console.log('No saved configuration found - nothing to reset.');
    return;
  }

  const current = loadSettings();
  console.log('Current saved configuration:');
  console.log(`  Printer: ${current.printerName || '(none)'}`);
  console.log(`  Print mode: ${current.printMode || '(none)'}`);
  console.log(`  Barcode type: ${current.barcodeType || '(none)'}`);
  console.log(`  Port: ${current.port || '(none)'}`);
  console.log('');
  console.log('This clears ONLY printer-settings.json next to the exe.');
  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await ask(rl, 'Continue? (y/n): ');
  rl.close();

  if (answer.trim().toLowerCase() !== 'y') {
    console.log('Cancelled - configuration left unchanged.');
    return;
  }

  clearSettings();
  console.log('Done. Run MES-Printer again to pick a printer and mode.');
}

main().catch((err) => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
