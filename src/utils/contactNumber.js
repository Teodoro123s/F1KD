export const sanitizeContactNumber = (value) => String(value ?? '').replace(/\D/g, '').slice(0, 11);

export const isValidContactNumber = (value) => /^09\d{9}$/.test(String(value ?? ''));

export const CONTACT_NUMBER_POLICY = 'Enter exactly 11 digits starting with 09.';
