const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  LABEL_WIDTH_MM,
  LABEL_HEIGHT_MM,
  LABEL_GAP_MM,
  FORM_HEIGHT_MM,
  FORM_HEIGHT_HU,
  LABEL_HEIGHT_HU,
} = require('../src/labelLayout');

describe('labelLayout pitch', () => {
  it('form height is label + gap for GDI registration', () => {
    assert.equal(LABEL_WIDTH_MM, 10);
    assert.equal(LABEL_HEIGHT_MM, 10);
    assert.equal(LABEL_GAP_MM, 2);
    assert.equal(FORM_HEIGHT_MM, 12);
    assert.ok(FORM_HEIGHT_HU > LABEL_HEIGHT_HU);
  });
});
