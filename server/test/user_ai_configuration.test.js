const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'user-ai-settings-test-secret';

const mysql = require('mysql2/promise');
let queryHandler = async () => [[]];
const testPool = {
  query: (...args) => queryHandler(...args),
  getConnection: async () => ({
    query: async () => [[]],
    release() {},
  }),
};

mysql.createPool = () => testPool;
mysql.createConnection = async () => ({
  query: async () => [[]],
  end: async () => {},
});

const database = require('../db');
const {
  ProgressReportAIError,
  decryptApiKey,
  encryptApiKey,
  getEncryptionKey,
  getPublicConfiguration,
  getUserAiConfiguration,
  normalizeConfiguration,
  saveUserConfiguration,
  testProviderConnection,
  testSavedConfiguration,
  userConfigurationEnvironment,
} = require('../services/userAiConfiguration');
const { containsPotentialPii, isDisallowedAIRequest } = require('../utils/aiRequestPolicy');
const {
  createDashboardInsight,
  normalizeDashboardMetrics,
} = require('../utils/progressReportAI');

const encryptionEnvironment = { AI_SETTINGS_ENCRYPTION_KEY: 'a'.repeat(64) };
const providerEnvironment = {
  ...encryptionEnvironment,
  PROGRESS_REPORT_AI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  PROGRESS_REPORT_AI_MODEL: 'gemini-3.1-flash-lite',
};

test('database initialization completes before configuration storage tests', async () => {
  await database.ready;
});

test('requires a 256-bit server encryption key and encrypts credentials with authenticated encryption', () => {
  assert.throws(() => getEncryptionKey({}), ProgressReportAIError);
  assert.throws(() => getEncryptionKey({ AI_SETTINGS_ENCRYPTION_KEY: 'short' }), ProgressReportAIError);

  const saved = encryptApiKey('secret-provider-key', 42, encryptionEnvironment);
  assert.notEqual(saved.encrypted.toString('utf8'), 'secret-provider-key');
  assert.equal(decryptApiKey(saved, 42, encryptionEnvironment), 'secret-provider-key');
  assert.throws(() => decryptApiKey(saved, 43, encryptionEnvironment));
  const altered = { ...saved, encrypted: Buffer.from(saved.encrypted) };
  altered.encrypted[0] ^= 0xff;
  assert.throws(() => decryptApiKey(altered, 42, encryptionEnvironment));
});

test('accepts an API key and uses the server-configured provider and model', () => {
  assert.deepEqual(normalizeConfiguration({
    apiKey: 'secret-provider-key',
  }, providerEnvironment), {
    provider: 'openai-compatible',
    model: 'gemini-3.1-flash-lite',
    apiKey: 'secret-provider-key',
  });
  assert.throws(() => normalizeConfiguration({
    apiKey: 'secret-provider-key',
  }, encryptionEnvironment), /endpoint and model/);
  assert.throws(() => normalizeConfiguration({
    apiKey: '',
  }, providerEnvironment), /API key/);
});

test('AI request policy refuses record mutations and commands but permits read-only reporting requests', () => {
  for (const prompt of [
    'Create a new mother for this community.',
    'Delete the children in this batch.',
    'Update this beneficiary record.',
    'Run an SQL command to list users.',
  ]) {
    assert.equal(isDisallowedAIRequest(prompt), true, prompt);
  }
  for (const prompt of [
    'Generate a maternal monitoring report for the selected batch.',
    'Show the number of mothers in each trimester.',
    'Compare child monitoring rates between communities.',
  ]) {
    assert.equal(isDisallowedAIRequest(prompt), false, prompt);
  }
});

test('AI request policy detects likely personal details but permits aggregate report prompts', () => {
  for (const prompt of [
    'Email maria@example.com about this report.',
    'Call 09171234567 after the meeting.',
    'Show the record for beneficiary ID: BEN-12345.',
    'Show the report for the child named Maria Santos.',
  ]) {
    assert.equal(containsPotentialPii(prompt), true, prompt);
  }
  for (const prompt of [
    'Show maternal monitoring reports by community.',
    'Compare child checkups from 2026-01-01 to 2026-01-31.',
    'Show reports for children named by community, without identifying details.',
  ]) {
    assert.equal(containsPotentialPii(prompt), false, prompt);
  }
});

test('dashboard insights accept only aggregate metrics and use the signed-in user key', async () => {
  const metrics = {
    motherCount: 15,
    childCount: 21,
    beneficiaryCount: 36,
    followUpCount: 4,
    communityCount: 2,
    dataQuality: { incompleteSources: [] },
  };
  assert.deepEqual(normalizeDashboardMetrics(metrics), metrics);
  assert.throws(() => normalizeDashboardMetrics({
    ...metrics,
    beneficiaryNames: ['Private Name'],
  }), /supported non-negative aggregate counts/);

  const saved = encryptApiKey('signed-in-user-key', 42, encryptionEnvironment);
  queryHandler = async (sql, params) => {
    assert.match(sql, /SELECT provider, model, encrypted_api_key/);
    assert.deepEqual(params, [42]);
    return [[{
      provider: 'openai-compatible',
      model: 'gemini-3.1-flash-lite',
      encrypted_api_key: saved.encrypted,
      encryption_iv: saved.iv,
      encryption_auth_tag: saved.authTag,
      last_tested_at: new Date('2026-10-29T00:00:00Z'),
    }]];
  };
  const configuration = await getUserAiConfiguration(42, providerEnvironment);
  let request;
  let usesUserKey = false;
  const insight = await createDashboardInsight(metrics, 'Summarize these totals.', {
    env: userConfigurationEnvironment(configuration, providerEnvironment),
    fetchImpl: async (url, options) => {
      usesUserKey = options.headers.Authorization === `Bearer ${configuration.apiKey}`;
      request = { url, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'The dashboard shows 36 beneficiaries.' } }],
      }), { status: 200 });
    },
  });

  assert.equal(insight, 'The dashboard shows 36 beneficiaries.');
  assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
  assert.equal(usesUserKey, true);
  assert.equal(request.body.model, 'gemini-3.1-flash-lite');
  assert.match(request.body.messages[1].content, /"beneficiaryCount":36/);
  assert.doesNotMatch(request.body.messages[1].content, /signed-in-user-key|Private Name/);
});

test('connection tests authenticate with the key but do not send it in the request body', async () => {
  let request;
  await testProviderConnection({
    apiKey: 'secret-provider-key',
  }, {
    env: providerEnvironment,
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 });
    },
  });

  assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
  assert.equal(request.options.headers.Authorization, 'Bearer secret-provider-key');
  assert.equal(request.body.model, 'gemini-3.1-flash-lite');
  assert.doesNotMatch(JSON.stringify(request.body), /secret-provider-key/);
});

test('provider failures return sanitized messages without echoing provider response bodies', async () => {
  await assert.rejects(testProviderConnection({
    apiKey: 'secret-provider-key',
  }, {
    env: providerEnvironment,
    fetchImpl: async () => new Response('secret-provider-key rejected', { status: 401 }),
  }), (error) => {
    assert.match(error.message, /provider rejected/i);
    assert.doesNotMatch(error.message, /secret-provider-key/);
    return true;
  });
});

test('connection tests abort slow providers and return a safe timeout message', async () => {
  await assert.rejects(testProviderConnection({
    apiKey: 'secret-provider-key',
  }, {
    env: providerEnvironment,
    timeoutMs: 1,
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      }, { once: true });
    }),
  }), (error) => {
    assert.match(error.message, /too long to respond/i);
    assert.doesNotMatch(error.message, /secret-provider-key/);
    assert.equal(error.status, 504);
    return true;
  });
});

test('configuration reads and writes are scoped to one user and public responses omit credentials', async () => {
  let stored = null;
  queryHandler = async (sql, params) => {
    if (/SELECT provider, model, encrypted_api_key/.test(sql)) {
      assert.deepEqual(params, [42]);
      return [[stored].filter(Boolean)];
    }
    if (/INSERT INTO user_ai_configurations/.test(sql)) {
      assert.deepEqual(params.slice(0, 3), [42, 'openai-compatible', 'gemini-3.1-flash-lite']);
      stored = {
        provider: params[1],
        model: params[2],
        encrypted_api_key: params[3],
        encryption_iv: params[4],
        encryption_auth_tag: params[5],
        last_tested_at: new Date('2026-10-29T00:00:00Z'),
      };
      return [{ affectedRows: 1 }];
    }
    if (/UPDATE user_ai_configurations/.test(sql)) {
      assert.deepEqual(params, ['gemini-3.1-flash-lite', 42]);
      stored.model = params[0];
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected query: ${sql}`);
  };
  const options = {
    env: providerEnvironment,
    fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 }),
  };

  const publicConfig = await saveUserConfiguration(42, {
    apiKey: 'secret-provider-key',
  }, options);
  assert.equal(publicConfig.configured, true);
  assert.equal(publicConfig.providerName, 'Google Gemini');
  assert.equal(publicConfig.model, 'gemini-3.1-flash-lite');
  assert.equal(Object.hasOwn(publicConfig, 'apiKey'), false);
  assert.equal(Object.hasOwn(publicConfig, 'encrypted_api_key'), false);
  assert.equal(Object.hasOwn(publicConfig, 'provider'), false);
  assert.equal(Object.hasOwn(publicConfig, 'endpoint'), false);
  assert.notEqual(stored.encrypted_api_key.toString('utf8'), 'secret-provider-key');

  const privateConfig = await getUserAiConfiguration(42, providerEnvironment);
  assert.equal(privateConfig.apiKey, 'secret-provider-key');
  assert.deepEqual(await getPublicConfiguration(42, providerEnvironment), publicConfig);
  await testSavedConfiguration(42, options);
});
