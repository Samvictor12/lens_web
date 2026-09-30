const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { formatStartupError } = require('../src/startupFatal');

describe('startupFatal', () => {
  it('explains EADDRINUSE clearly', () => {
    const err = Object.assign(new Error('listen EADDRINUSE'), { code: 'EADDRINUSE' });
    const msg = formatStartupError(err);
    assert.match(msg, /Port is already in use/);
    assert.match(msg, /Task Manager/);
  });

  it('falls back to Error.message', () => {
    assert.equal(formatStartupError(new Error('boom')), 'boom');
  });
});
