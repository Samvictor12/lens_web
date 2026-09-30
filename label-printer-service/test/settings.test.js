const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('settingsStore', () => {
  it('save/load/clear settings in app dir override via temp cwd simulation', () => {
    // settingsStore uses getAppDir from __dirname/pkg — test clear/load API with real module
    // by writing to the actual settings path after backup is awkward; instead test clearSettings
    // contract using a copied approach: verify functions exist and round-trip when file present.
    const store = require('../src/settingsStore');
    const settingsPath = store.getSettingsPath();
    const backup = fs.existsSync(settingsPath)
      ? fs.readFileSync(settingsPath, 'utf8')
      : null;

    try {
      store.saveSettings({ printerName: 'TestPrinter', printMode: 'auto', port: 8081 });
      const loaded = store.loadSettings();
      assert.equal(loaded.printerName, 'TestPrinter');
      assert.equal(loaded.printMode, 'auto');
      assert.equal(loaded.port, 8081);
      assert.equal(store.clearSettings(), true);
      assert.deepEqual(store.loadSettings(), {});
    } finally {
      if (backup !== null) {
        fs.writeFileSync(settingsPath, backup);
      } else if (fs.existsSync(settingsPath)) {
        fs.unlinkSync(settingsPath);
      }
    }
  });
});
