const test = require('node:test');
const assert = require('node:assert/strict');
const { INVALID_ASSISTANCE_AMOUNT_MESSAGE, parseAssistanceAmount } = require('../utils/assistanceAmount');

test('parseAssistanceAmount accepts blank values and valid DECIMAL(10,2) amounts', () => {
  assert.deepEqual(parseAssistanceAmount(''), { valid: true, value: null });
  assert.deepEqual(parseAssistanceAmount('0000123.40'), { valid: true, value: '123.40' });
  assert.deepEqual(parseAssistanceAmount('.5'), { valid: true, value: '0.5' });
  assert.deepEqual(parseAssistanceAmount('99999999.99'), { valid: true, value: '99999999.99' });
});

test('parseAssistanceAmount rejects values that would overflow the database column', () => {
  for (const value of ['100000000', '1.234', '-1', '1,000', 'abc']) {
    assert.deepEqual(parseAssistanceAmount(value), { valid: false, value: null });
  }
  assert.match(INVALID_ASSISTANCE_AMOUNT_MESSAGE, /99,999,999\.99/);
});
