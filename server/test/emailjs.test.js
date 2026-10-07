const assert = require('node:assert/strict');
const test = require('node:test');
const { sendAccountCredentials, sendPasswordResetCode } = require('../services/emailjs');

const envKeys = [
  'EMAILJS_SERVICE_ID',
  'EMAILJS_PUBLIC_KEY',
  'EMAILJS_PRIVATE_KEY',
  'EMAILJS_USER_TEMPLATE_ID',
  'EMAILJS_OTP_TEMPLATE_ID',
];

function withEmailJsEnv(values, run) {
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const previousFetch = global.fetch;
  for (const key of envKeys) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }

  return Promise.resolve()
    .then(run)
    .finally(() => {
      for (const key of envKeys) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
      global.fetch = previousFetch;
    });
}

test('EmailJS reports missing backend configuration', async () => {
  await withEmailJsEnv({}, async () => {
    await assert.rejects(
      sendPasswordResetCode({ email: 'person@example.test', name: 'Person', passcode: '123456', time: '10:00 UTC' }),
      /EmailJS is not configured/,
    );
  });
});

test('EmailJS sends the OTP template variables and private access token', async () => {
  await withEmailJsEnv({
    EMAILJS_SERVICE_ID: 'service-id',
    EMAILJS_PUBLIC_KEY: 'public-key',
    EMAILJS_PRIVATE_KEY: 'private-key',
    EMAILJS_OTP_TEMPLATE_ID: 'otp-template',
  }, async () => {
    let request;
    global.fetch = async (url, options) => {
      request = { url, options };
      return { ok: true, status: 200 };
    };

    await sendPasswordResetCode({
      email: 'person@example.test',
      name: 'Person',
      passcode: '123456',
      time: '10:00 UTC',
    });

    assert.equal(request.url, 'https://api.emailjs.com/api/v1.0/email/send');
    assert.deepEqual(JSON.parse(request.options.body), {
      service_id: 'service-id',
      template_id: 'otp-template',
      user_id: 'public-key',
      accessToken: 'private-key',
      template_params: {
        to_email: 'person@example.test',
        to_name: 'Person',
        passcode: '123456',
        time: '10:00 UTC',
      },
    });
  });
});

test('EmailJS sends temporary credentials with the account template variables', async () => {
  await withEmailJsEnv({
    EMAILJS_SERVICE_ID: 'service-id',
    EMAILJS_PUBLIC_KEY: 'public-key',
    EMAILJS_USER_TEMPLATE_ID: 'account-template',
  }, async () => {
    let requestBody;
    global.fetch = async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return { ok: true, status: 200 };
    };

    await sendAccountCredentials({
      email: 'person@example.test',
      name: 'Person',
      password: 'temporary-password',
      role: 'health_worker',
    });

    assert.deepEqual(requestBody.template_params, {
      to_email: 'person@example.test',
      to_name: 'Person',
      password: 'temporary-password',
      role: 'health_worker',
    });
    assert.equal(requestBody.accessToken, undefined);
  });
});

test('EmailJS surfaces provider errors instead of reporting success', async () => {
  await withEmailJsEnv({
    EMAILJS_SERVICE_ID: 'service-id',
    EMAILJS_PUBLIC_KEY: 'public-key',
    EMAILJS_OTP_TEMPLATE_ID: 'otp-template',
  }, async () => {
    global.fetch = async () => ({ ok: false, status: 429 });
    await assert.rejects(
      sendPasswordResetCode({ email: 'person@example.test', name: 'Person', passcode: '123456', time: '10:00 UTC' }),
      /EmailJS send failed with HTTP 429/,
    );
  });
});
