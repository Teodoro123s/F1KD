const PHILHEALTH_NUMBER_POLICY = 'PhilHealth PIN must contain exactly 12 digits (XX-XXXXXXXXX-X)';

function formatPhilHealthNumber(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return `${digits.slice(0, 2)}-${digits.slice(2, 11)}-${digits.slice(11, 12)}`;
}

function validatePhilHealthNumber(value, required = false) {
  const number = String(value ?? '');
  if (!number) return required ? 'PhilHealth PIN is required for members' : null;
  if (!/^(?:[0-9]{12}|[0-9]{2}-[0-9]{9}-[0-9])$/.test(number)) {
    return PHILHEALTH_NUMBER_POLICY;
  }
  return null;
}

module.exports = { formatPhilHealthNumber, validatePhilHealthNumber };
