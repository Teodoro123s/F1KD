const test = require('node:test');
const assert = require('node:assert/strict');
const {
  sendAccountCredentialsEmail,
  sendPasswordResetCodeEmail,
} = require('../services/emailjs');

test('EmailJS sends credential and OTP templates using server-side credentials', async (t) => {
  const envNames = [
    'EMAILJS_SERVICE_ID',
    'EMAILJS_PUBLIC_KEY',
    'EMAILJS_PRIVATE_KEY',
    'EMAILJS_CREDENTIALS_TEMPLATE_ID',
    'EMAILJS_USER_TEMPLATE_ID',
    'EMAILJS_OTP_TEMPLATE_ID',
    'APP_URL',
  ];
  const originalEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
  const originalFetch = global.fetch;
  const requests = [];
  Object.assign(process.env, {
    EMAILJS_SERVICE_ID: 'service-test',
    EMAILJS_PUBLIC_KEY: 'public-test',
    EMAILJS_PRIVATE_KEY: 'private-test',
    EMAILJS_USER_TEMPLATE_ID: 'template-credentials',
    EMAILJS_OTP_TEMPLATE_ID: 'template-otp',
    APP_URL: 'https://f1kd.example.test',
  });
  global.fetch = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return new Response('OK', { status: 200 });
  };
  t.after(() => {
    global.fetch = originalFetch;
    for (const name of envNames) {
      if (originalEnv[name] === undefined) delete process.env[name];
      else process.env[name] = originalEnv[name];
    }
  });

  await sendAccountCredentialsEmail({
    email: 'worker@example.test',
    name: 'Test Worker',
    role: 'Health Worker',
    password: 'temporary-password',
  });
  await sendPasswordResetCodeEmail({
    email: 'worker@example.test',
    name: 'Test Worker',
    passcode: '012345',
    time: '11:45 PM',
  });

  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, 'https://api.emailjs.com/api/v1.0/email/send');
  assert.equal(requests[0].body.template_id, 'template-credentials');
  assert.equal(requests[0].body.user_id, 'public-test');
  assert.equal(requests[0].body.accessToken, 'private-test');
  assert.deepEqual(requests[0].body.template_params, {
    email: 'worker@example.test',
    to_email: 'worker@example.test',
    username: 'worker@example.test',
    login_url: 'https://f1kd.example.test/login',
    to_name: 'Test Worker',
    role: 'Health Worker',
    password: 'temporary-password',
  });
  assert.equal(requests[1].body.template_id, 'template-otp');
  assert.deepEqual(requests[1].body.template_params, {
    email: 'worker@example.test',
    to_email: 'worker@example.test',
    to_name: 'Test Worker',
    passcode: '012345',
    time: '11:45 PM',
  });
});
