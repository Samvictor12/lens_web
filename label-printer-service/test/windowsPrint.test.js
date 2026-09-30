const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  writeTempFile,
  warmupRawPrintWorker,
  shutdownRawPrintWorker,
  isWorkerReady,
} = require('../src/windowsPrint');
const fs = require('fs');

describe('windowsPrint helpers', () => {
  it('warmup is a no-op off Windows', async () => {
    if (process.platform === 'win32') return;
    await warmupRawPrintWorker();
    assert.equal(isWorkerReady(), false);
    shutdownRawPrintWorker();
  });

  it('writeTempFile writes and can be deleted', () => {
    const filePath = writeTempFile('unit', '.txt', 'hello');
    assert.equal(fs.readFileSync(filePath, 'utf8'), 'hello');
    fs.unlinkSync(filePath);
  });
});
