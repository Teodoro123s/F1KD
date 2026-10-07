const assert = require('node:assert/strict');
const test = require('node:test');
const { decryptCredential, encryptCredential } = require('../services/credentialCipher');

test('credential encryption round-trips without storing the password in plaintext', () => {
  const password = 'temporary-password-123';
  const encrypted = encryptCredential(password);

  assert.notEqual(encrypted, password);
  assert.equal(decryptCredential(encrypted), password);
});

test('credential decryption rejects malformed and altered values', () => {
  assert.throws(() => decryptCredential('invalid'));
  const encrypted = encryptCredential('temporary-password-123');
  const [iv, tag, data] = encrypted.split('.');
  const altered = `${iv}.${tag}.${Buffer.from(data, 'base64url').map((byte) => byte ^ 1).toString('base64url')}`;

  assert.throws(() => decryptCredential(altered));
});
