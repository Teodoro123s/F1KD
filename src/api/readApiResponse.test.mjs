import test from 'node:test';
import assert from 'node:assert/strict';
import { readApiResponse } from './readApiResponse.mjs';

function response({ ok, status = 200, body = '', statusText = '' }) {
  return {
    ok,
    status,
    statusText,
    text: async () => body,
  };
}

test('returns parsed JSON responses and supports empty success responses', async () => {
  assert.deepEqual(
    await readApiResponse(response({ ok: true, body: '{"result":"saved"}' }), 'Save failed'),
    { result: 'saved' },
  );
  assert.equal(await readApiResponse(response({ ok: true }), 'Save failed'), null);
});

test('preserves server validation messages and response metadata', async () => {
  await assert.rejects(
    readApiResponse(
      response({ ok: false, status: 400, body: '{"error":"Email is invalid"}', statusText: 'Bad Request' }),
      'Save failed',
    ),
    (error) => error.message === 'Email is invalid' && error.status === 400 && error.body.error === 'Email is invalid',
  );
});

test('uses short plain-text client errors without showing HTML error pages', async () => {
  await assert.rejects(
    readApiResponse(response({ ok: false, status: 400, body: 'Request body is required' }), 'Save failed'),
    { message: 'Request body is required' },
  );
  await assert.rejects(
    readApiResponse(response({ ok: false, status: 404, body: '<html>Not found</html>' }), 'Load failed'),
    { message: 'Load failed (HTTP 404)' },
  );
});

test('uses actionable fallback text instead of generic HTTP status text', async () => {
  await assert.rejects(
    readApiResponse(response({ ok: false, status: 503, statusText: 'Service Unavailable' }), 'Unable to load users'),
    (error) => error.message === 'Unable to load users (HTTP 503)',
  );
});

test('formats server validation detail arrays', async () => {
  await assert.rejects(
    readApiResponse(
      response({ ok: false, status: 400, body: '{"errors":[{"message":"Name is required"},"Email is invalid"]}' }),
      'Save failed',
    ),
    (error) => error.message === 'Name is required Email is invalid',
  );
});

test('does not expose non-text error payloads as misleading messages', async () => {
  await assert.rejects(
    readApiResponse(
      response({ ok: false, status: 500, body: '{"error":{"code":"DB_FAILURE"}}' }),
      'Unable to save the record',
    ),
    (error) => error.message === 'Unable to save the record (HTTP 500)',
  );
});

test('rejects malformed success bodies explicitly', async () => {
  await assert.rejects(
    readApiResponse(response({ ok: true, body: '<html>not JSON</html>' }), 'Load failed'),
    { message: 'The server returned an invalid response.' },
  );
});
