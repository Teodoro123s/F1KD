const EMAILJS_SEND_URL = 'https://api.emailjs.com/api/v1.0/email/send';

function getEmailJsConfig(templateId) {
  const config = {
    serviceId: process.env.EMAILJS_SERVICE_ID,
    templateId,
    publicKey: process.env.EMAILJS_PUBLIC_KEY,
    privateKey: process.env.EMAILJS_PRIVATE_KEY,
  };

  const missing = [
    ['EMAILJS_SERVICE_ID', config.serviceId],
    ['EMAILJS_PUBLIC_KEY', config.publicKey],
    ['EmailJS template ID', config.templateId],
  ].filter(([, value]) => !value);

  if (missing.length) {
    throw new Error(`EmailJS is not configured: missing ${missing.map(([name]) => name).join(', ')}`);
  }

  return config;
}

async function sendEmailJsTemplate(templateId, templateParams) {
  const config = getEmailJsConfig(templateId);
  const body = {
    service_id: config.serviceId,
    template_id: config.templateId,
    user_id: config.publicKey,
    template_params: templateParams,
  };
  if (config.privateKey) body.accessToken = config.privateKey;

  try {
    const response = await fetch(EMAILJS_SEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      throw new Error(`EmailJS send failed with HTTP ${response.status}`);
    }
  } catch (error) {
    if (error.message.startsWith('EmailJS')) throw error;
    throw new Error(`EmailJS request failed: ${error.message}`);
  }
}

async function sendAccountCredentials({ email, name, password, role }) {
  await sendEmailJsTemplate(process.env.EMAILJS_USER_TEMPLATE_ID, {
    to_email: email,
    to_name: name,
    password,
    role,
  });
}

async function sendPasswordResetCode({ email, name, passcode, time }) {
  await sendEmailJsTemplate(process.env.EMAILJS_OTP_TEMPLATE_ID, {
    to_email: email,
    to_name: name,
    passcode,
    time,
  });
}

module.exports = { sendAccountCredentials, sendPasswordResetCode };
