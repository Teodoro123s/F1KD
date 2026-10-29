const { createCipheriv, createDecipheriv, randomBytes } = require('node:crypto');
const pool = require('../db');
const { ProgressReportAIError, getAIConfiguration } = require('../utils/progressReportAI');

const PROVIDER = 'openai-compatible';
const MAX_API_KEY_LENGTH = 512;
const PROVIDER_CONNECTION_TIMEOUT_MS = 25000;

function getEncryptionKey(env = process.env) {
  const value = String(env.AI_SETTINGS_ENCRYPTION_KEY || '');
  if (!/^[\da-f]{64}$/i.test(value)) {
    throw new ProgressReportAIError(
      'AI settings are unavailable until the server has a valid AI_SETTINGS_ENCRYPTION_KEY.',
      503,
    );
  }
  return Buffer.from(value, 'hex');
}

function normalizeConfiguration({ apiKey }, env = process.env) {
  const normalizedApiKey = String(apiKey || '').trim();
  if (!normalizedApiKey || normalizedApiKey.length > MAX_API_KEY_LENGTH || /[\r\n]/.test(normalizedApiKey)) {
    throw new ProgressReportAIError('Enter a valid API key.', 400);
  }
  const providerConfiguration = getAIConfiguration({
    ...env,
    PROGRESS_REPORT_AI_API_KEY: normalizedApiKey,
  });
  if (!providerConfiguration) {
    throw new ProgressReportAIError(
      'The server administrator has not configured the AI provider endpoint and model.',
      503,
    );
  }
  return { provider: PROVIDER, apiKey: normalizedApiKey, model: providerConfiguration.model };
}

function encryptApiKey(apiKey, userId, env = process.env) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(env), iv);
  cipher.setAAD(Buffer.from(`user-ai-key:${userId}`));
  const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  return { encrypted, iv, authTag: cipher.getAuthTag() };
}

function decryptApiKey({ encrypted, iv, authTag }, userId, env = process.env) {
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(env), iv);
  decipher.setAAD(Buffer.from(`user-ai-key:${userId}`));
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function getProviderConfiguration(apiKey, env = process.env) {
  const configuration = getAIConfiguration({
    ...env,
    PROGRESS_REPORT_AI_API_KEY: apiKey,
  });
  if (!configuration) {
    throw new ProgressReportAIError(
      'The server administrator has not configured the AI provider endpoint and model.',
      503,
    );
  }
  return configuration;
}

async function testProviderConnection({ apiKey }, {
  env = process.env,
  fetchImpl = globalThis.fetch,
  timeoutMs = PROVIDER_CONNECTION_TIMEOUT_MS,
} = {}) {
  const configuration = getProviderConfiguration(apiKey, env);
  if (typeof fetchImpl !== 'function') {
    throw new ProgressReportAIError('The AI provider is unavailable.', 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(configuration.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(configuration.apiKey ? { Authorization: `Bearer ${configuration.apiKey}` } : {}),
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: configuration.model,
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        max_tokens: 8,
        temperature: 0,
      }),
    });
    if (!response.ok) {
      console.warn(`[AI Settings] Provider connection test failed with status ${response.status}.`);
      throw new ProgressReportAIError(
        response.status === 401 || response.status === 403
          ? 'The provider rejected the API key. Check the key and try again.'
          : response.status === 429
            ? 'The provider rate limit was reached. Wait before testing again.'
            : 'The provider could not confirm this model. Check the model name and try again.',
        502,
      );
    }
    const payload = await response.json();
    if (typeof payload?.choices?.[0]?.message?.content !== 'string') {
      throw new ProgressReportAIError('The provider returned an invalid connection-test response.', 502);
    }
    return true;
  } catch (error) {
    if (error instanceof ProgressReportAIError) throw error;
    if (error.name === 'AbortError') {
      throw new ProgressReportAIError('The provider took too long to respond. Check the connection and try again.', 504);
    }
    throw new ProgressReportAIError('Could not reach the configured AI provider.', 502);
  } finally {
    clearTimeout(timeout);
  }
}

async function getStoredConfiguration(userId) {
  const [rows] = await pool.query(
    `SELECT provider, model, encrypted_api_key, encryption_iv, encryption_auth_tag, last_tested_at
     FROM user_ai_configurations WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

async function getUserAiConfiguration(userId, env = process.env) {
  const stored = await getStoredConfiguration(userId);
  if (!stored) return null;
  if (stored.provider !== PROVIDER) {
    throw new ProgressReportAIError('The saved AI provider configuration is not supported.', 503);
  }
  const apiKey = decryptApiKey({
    encrypted: stored.encrypted_api_key,
    iv: stored.encryption_iv,
    authTag: stored.encryption_auth_tag,
  }, userId, env);
  return {
    provider: stored.provider,
    model: getProviderConfiguration(apiKey, env).model,
    apiKey,
    lastTestedAt: stored.last_tested_at,
  };
}

async function getPublicConfiguration(userId, env = process.env) {
  const stored = await getStoredConfiguration(userId);
  const providerConfiguration = getAIConfiguration(env);
  const providerHost = providerConfiguration ? new URL(providerConfiguration.endpoint).hostname : '';
  const providerName = providerHost === 'generativelanguage.googleapis.com'
    ? 'Google Gemini'
    : providerHost === 'api.groq.com'
      ? 'Groq'
      : providerHost === 'api.openai.com'
        ? 'OpenAI'
        : providerConfiguration
          ? 'Configured AI provider'
          : null;
  return {
    configured: Boolean(stored),
    providerName,
    model: providerConfiguration?.model || null,
    lastTestedAt: stored?.last_tested_at || null,
  };
}

async function saveUserConfiguration(userId, input, options = {}) {
  const configuration = normalizeConfiguration(input, options.env);
  getEncryptionKey(options.env);
  await testProviderConnection(configuration, options);
  const { encrypted, iv, authTag } = encryptApiKey(configuration.apiKey, userId, options.env);
  await pool.query(
    `INSERT INTO user_ai_configurations
       (user_id, provider, model, encrypted_api_key, encryption_iv, encryption_auth_tag, last_tested_at)
     VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       provider = VALUES(provider),
       model = VALUES(model),
       encrypted_api_key = VALUES(encrypted_api_key),
       encryption_iv = VALUES(encryption_iv),
       encryption_auth_tag = VALUES(encryption_auth_tag),
       last_tested_at = UTC_TIMESTAMP()`,
    [userId, configuration.provider, configuration.model, encrypted, iv, authTag],
  );
  return getPublicConfiguration(userId, options.env);
}

async function testSavedConfiguration(userId, options = {}) {
  const stored = await getStoredConfiguration(userId);
  if (!stored) throw new ProgressReportAIError('Configure an API key before testing the connection.', 400);
  if (stored.provider !== PROVIDER) {
    throw new ProgressReportAIError('The saved AI provider configuration is not supported.', 503);
  }
  const apiKey = decryptApiKey({
    encrypted: stored.encrypted_api_key,
    iv: stored.encryption_iv,
    authTag: stored.encryption_auth_tag,
  }, userId, options.env);
  await testProviderConnection({ apiKey }, options);
  await pool.query(
    'UPDATE user_ai_configurations SET model = ?, last_tested_at = UTC_TIMESTAMP() WHERE user_id = ?',
    [getProviderConfiguration(apiKey, options.env).model, userId],
  );
  return getPublicConfiguration(userId, options.env);
}

async function removeUserConfiguration(userId) {
  await pool.query('DELETE FROM user_ai_configurations WHERE user_id = ?', [userId]);
}

function userConfigurationEnvironment(configuration, env = process.env) {
  return {
    ...env,
    PROGRESS_REPORT_AI_API_KEY: configuration.apiKey,
  };
}

module.exports = {
  PROVIDER,
  ProgressReportAIError,
  decryptApiKey,
  encryptApiKey,
  getEncryptionKey,
  getPublicConfiguration,
  getUserAiConfiguration,
  normalizeConfiguration,
  removeUserConfiguration,
  saveUserConfiguration,
  testProviderConnection,
  testSavedConfiguration,
  userConfigurationEnvironment,
};
