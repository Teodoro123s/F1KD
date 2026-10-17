const CONTACT_NUMBER_POLICY = 'must contain exactly 11 digits and start with 09';

function isValidContactNumber(value) {
  return /^09\d{9}$/.test(String(value ?? ''));
}

function validateContactNumber(value, fieldName = 'Contact number') {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  if (!isValidContactNumber(value)) {
    return `${fieldName} ${CONTACT_NUMBER_POLICY}`;
  }
  return null;
}

module.exports = { CONTACT_NUMBER_POLICY, isValidContactNumber, validateContactNumber };
