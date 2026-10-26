import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrencyAmount, normalizeCurrencyAmount, sanitizeCurrencyAmount } from './currencyAmount.js';

test('sanitizes amount input to non-negative digits and at most two decimal places', () => {
  assert.equal(sanitizeCurrencyAmount('-50030.009'), '50030.00');
  assert.equal(sanitizeCurrencyAmount('PHP 1,234.50'), '1234.50');
  assert.equal(sanitizeCurrencyAmount('12..34'), '12.34');
});

test('normalizes and formats amounts with grouped thousands separators', () => {
  assert.equal(normalizeCurrencyAmount('00050030.00'), '50030.00');
  assert.equal(normalizeCurrencyAmount('.5'), '0.5');
  assert.equal(normalizeCurrencyAmount('123.'), '123');
  assert.equal(formatCurrencyAmount('50030.00'), '50,030.00');
  assert.equal(formatCurrencyAmount(''), '');
});
