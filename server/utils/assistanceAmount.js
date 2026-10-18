const MAX_ASSISTANCE_AMOUNT = 99999999.99;
const INVALID_ASSISTANCE_AMOUNT_MESSAGE = 'Assistance amount must be between 0 and 99,999,999.99 with up to 2 decimal places.';

function parseAssistanceAmount(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return { valid: true, value: null };
  }

  const match = /^(\d*)(?:\.(\d{1,2}))?$/.exec(String(value).trim());
  if (!match || (!match[1] && !match[2])) {
    return { valid: false, value: null };
  }

  const whole = (match[1] || '0').replace(/^0+(?=\d)/, '');
  const normalized = `${whole}${match[2] === undefined ? '' : `.${match[2]}`}`;
  if (whole.length > 8 || Number(normalized) > MAX_ASSISTANCE_AMOUNT) {
    return { valid: false, value: null };
  }

  return { valid: true, value: normalized };
}

module.exports = { INVALID_ASSISTANCE_AMOUNT_MESSAGE, parseAssistanceAmount };
