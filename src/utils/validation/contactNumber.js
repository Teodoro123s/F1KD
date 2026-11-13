export const sanitizeContactNumber = (value) => String(value ?? '').replace(/\D/g, '');

export const isValidContactNumber = (value) => /^09\d{9}$/.test(String(value ?? ''));

export const CONTACT_NUMBER_POLICY = 'Enter exactly 11 digits starting with 09.';

export const getContactNumberError = (value, { required = false, label = 'Contact number' } = {}) => {
  const normalized = String(value ?? '').trim();
  if (!normalized) return required ? `${label} is required.` : '';
  return isValidContactNumber(normalized) ? '' : CONTACT_NUMBER_POLICY;
};
