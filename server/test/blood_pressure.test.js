const test = require('node:test');
const assert = require('node:assert/strict');
const { getBloodPressureError } = require('../utils/bloodPressure');

test('accepts blood pressure readings in range with systolic higher than diastolic', () => {
  for (const value of ['70/40', '120/80', '250/150']) {
    assert.equal(getBloodPressureError(value), '');
  }
});

test('requires standard systolic/diastolic format', () => {
  assert.match(getBloodPressureError(''), /required/i);
  assert.match(getBloodPressureError('120'), /systolic\/diastolic/i);
  assert.match(getBloodPressureError('120 / 80'), /systolic\/diastolic/i);
  assert.equal(getBloodPressureError('', { required: false }), '');
});

test('enforces systolic and diastolic ranges and their relationship', () => {
  assert.match(getBloodPressureError('69/40'), /Systolic pressure/);
  assert.match(getBloodPressureError('251/80'), /Systolic pressure/);
  assert.match(getBloodPressureError('120/39'), /Diastolic pressure/);
  assert.match(getBloodPressureError('120/151'), /Diastolic pressure/);
  assert.match(getBloodPressureError('120/120'), /higher than diastolic/);
  assert.match(getBloodPressureError('100/110'), /higher than diastolic/);
});
