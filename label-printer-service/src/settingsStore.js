const fs = require('fs');
const path = require('path');

function getAppDir() {
  if (process.pkg) {
    return path.dirname(process.execPath);
  }
  return path.join(__dirname, '..');
}

function getSettingsPath() {
  return path.join(getAppDir(), 'printer-settings.json');
}

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(getSettingsPath(), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

function saveSettings(settings) {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
}

function clearSettings() {
  const settingsPath = getSettingsPath();
  if (fs.existsSync(settingsPath)) {
    fs.unlinkSync(settingsPath);
    return true;
  }
  return false;
}

module.exports = {
  getAppDir,
  getSettingsPath,
  loadSettings,
  saveSettings,
  clearSettings,
};
