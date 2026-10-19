const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  const email = normalizeEmail(value);
  return email.length <= 255 && EMAIL_PATTERN.test(email);
}

function parseUserStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['active', 'enabled'].includes(normalized)) return 'Active';
  if (['suspended', 'inactive', 'disabled'].includes(normalized)) return 'Suspended';
  return null;
}

function parsePositiveIntegerId(value) {
  const id = String(value ?? '');
  if (!/^[1-9]\d*$/.test(id)) return null;
  const parsed = Number(id);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function validateAccountPassword(value, label = 'Password') {
  if (typeof value !== 'string' || value.length < 8) {
    return `${label} must be at least 8 characters`;
  }
  if (Buffer.byteLength(value, 'utf8') > 72) {
    return `${label} must be 72 UTF-8 bytes or fewer`;
  }
  return null;
}

module.exports = {
  isValidEmail,
  normalizeEmail,
  parsePositiveIntegerId,
  parseUserStatus,
  validateAccountPassword,
};
