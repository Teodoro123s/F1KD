const assert = require('node:assert/strict');
const test = require('node:test');
const bcrypt = require('bcrypt');
const { generateTemporaryPassword } = require('../services/temporaryPassword');

test('temporary passwords are eight random URL-safe characters and match their bcrypt hash', async () => {
  const password = generateTemporaryPassword();
  const hash = await bcrypt.hash(password, 4);

  assert.match(password, /^[A-Za-z0-9_-]{8}$/);
  assert.equal(await bcrypt.compare(password, hash), true);
  assert.equal(await bcrypt.compare(`${password}x`, hash), false);
});
