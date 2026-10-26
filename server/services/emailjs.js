const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

function getLoginUrl() {
  const appUrl = String(process.env.APP_URL || `http://localhost:${process.env.WEB_PORT || '5173'}`)
    .trim()
    .replace(/\/+$/, '');
  return `${appUrl}/login`;
}

function getEmailJsConfig(templateKey) {
  const config = {
    serviceId: process.env.EMAILJS_SERVICE_ID,
    publicKey: process.env.EMAILJS_PUBLIC_KEY,
    privateKey: process.env.EMAILJS_PRIVATE_KEY,
    templateId: process.env[`EMAILJS_${templateKey.toUpperCase()}_TEMPLATE_ID`]
      || (templateKey === 'credentials' ? process.env.EMAILJS_USER_TEMPLATE_ID : undefined),
  };
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`EmailJS is not configured: missing ${missing.join(', ')}`);
  }

  return config;
}

async function sendTemplateEmail(templateKey, templateParams) {
  const config = getEmailJsConfig(templateKey);
  const response = await fetch(EMAILJS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: config.serviceId,
      template_id: config.templateId,
      user_id: config.publicKey,
      accessToken: config.privateKey,
      template_params: templateParams,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`EmailJS rejected the email request (HTTP ${response.status})`);
  }
}

async function sendAccountCredentialsEmail({ email, name, role, password }) {
  return sendTemplateEmail('credentials', {
    email,
    to_email: email,
    username: email,
    login_url: getLoginUrl(),
    to_name: name,
    role,
    password,
  });
}

async function sendPasswordResetCodeEmail({ email, name, passcode, time }) {
  return sendTemplateEmail('otp', {
    email,
    to_email: email,
    to_name: name,
    passcode,
    time,
  });
}

module.exports = {
  getEmailJsConfig,
  sendAccountCredentialsEmail,
  sendPasswordResetCodeEmail,
  sendTemplateEmail,
};
