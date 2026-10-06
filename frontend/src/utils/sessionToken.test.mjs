import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeTokenPayload, getTokenExpiration, isTokenExpired } from './sessionToken.mjs';

const createToken = (payload) => `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;

test('decodes a JWT payload', () => {
  const token = createToken({ id: 7, role: 'admin' });

  assert.deepEqual(decodeTokenPayload(token), { id: 7, role: 'admin' });
});

test('returns the expiration time in milliseconds', () => {
  const token = createToken({ exp: 1_800_000_000 });

  assert.equal(getTokenExpiration(token), 1_800_000_000_000);
});

test('identifies expired, valid, and malformed tokens', () => {
  const validToken = createToken({ exp: 200 });
  const expiredToken = createToken({ exp: 100 });

  assert.equal(isTokenExpired(validToken, 100_000), false);
  assert.equal(isTokenExpired(expiredToken, 100_000), true);
  assert.equal(isTokenExpired('not-a-jwt', 100_000), true);
});
