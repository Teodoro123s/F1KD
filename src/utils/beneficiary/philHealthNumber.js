export const PHILHEALTH_NUMBER_POLICY = 'Enter 12 digits, formatted as XX-XXXXXXXXX-X.';

export const formatPhilHealthNumber = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 12);
  if (digits.length <= 2) return digits;
  if (digits.length <= 11) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 11)}-${digits.slice(11)}`;
};

export const getPhilHealthNumberError = (value, required = false) => {
  const number = String(value ?? '');
  if (!number) return required ? 'PhilHealth PIN is required for members.' : '';
  if (!/^(?:[0-9]{12}|[0-9]{2}-[0-9]{9}-[0-9])$/.test(number)) {
    return PHILHEALTH_NUMBER_POLICY;
  }
  return '';
};
