// Helpers for User Management (validation, normalization, formatters)
import { formatDateForInput } from '../../utils/dateFormat.js';
import { isValidContactNumber, sanitizeContactNumber } from '../../utils/contactNumber.js';
import { getFirstNameValidationError, isValidFirstName, normalizeFirstName } from '../../utils/firstNameValidation.js';
export const isValidName = (value) => /^[A-Za-z ]+$/.test((value || '').toString().trim());
export { getFirstNameValidationError, isValidFirstName, normalizeFirstName };
export const isValidMiddleInitial = (value) => value === '' || /^[A-Za-z]$/.test((value || '').toString().trim());
export const sanitizeDigits = (v) => (v || '').toString().replace(/\D/g, '');

export const normalizeContact = sanitizeContactNumber;
export const isValidContact = isValidContactNumber;
export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').toString().trim());

export const formatDobForInput = (v) => {
  return formatDateForInput(v);
};

// DOB validation: only ensure a valid date and not in the future. No minimum age enforced.
export const getDobValidationMessage = (value) => {
  if (!value) return 'Date of Birth is required.';
  const normalized = formatDateForInput(value);
  if (!normalized || Number(normalized.slice(0, 4)) < 1900) return 'Please enter a valid date.';
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (normalized > today) return 'Date of birth cannot be in the future.';
  return null;
};

export const isValidDob = (value) => !getDobValidationMessage(value);

export const generatePassword = (nextForm) => {
  // Desired format: Surname-like (preserve casing, spaces -> hyphens) + '.' + 3 random digits, e.g. "Sta-Ana.223".
  // Fall back to parts of name if lastName not provided.
  let lastNameRaw = (nextForm.lastName || '').trim();
  if (!lastNameRaw && nextForm.name) {
    const parts = nextForm.name.trim().split(/\s+/);
    if (parts.length > 1) {
      lastNameRaw = parts[parts.length - 1];
    } else if (parts.length === 1) {
      lastNameRaw = parts[0];
    }
  }

  // Clean surname: keep letters and hyphens, convert spaces to hyphens, preserve original casing
  let surname = lastNameRaw.replace(/\s+/g, '-').replace(/[^A-Za-z\-]/g, '');
  if (!surname) surname = 'user';

  // Generate 3 random digits (100-999 to avoid leading zero)
  const rand3 = Math.floor(100 + Math.random() * 900);
  let pw = `${surname}.${rand3}`;

  // Ensure minimum length (8) -- append more digits if necessary
  while (pw.length < 8) {
    pw += Math.floor(Math.random() * 10).toString();
  }
  return pw;
};
