// Helpers for User Management (validation, normalization, formatters)
export const isValidName = (value) => /^[A-Za-z ]+$/.test((value || '').toString().trim());
export const isValidMiddleInitial = (value) => value === '' || /^[A-Za-z]$/.test((value || '').toString().trim());
export const sanitizeDigits = (v) => (v || '').toString().replace(/\D/g, '');

export const normalizeContact = (v) => {
  const s = sanitizeDigits(v);
  if (!s) return s;
  if (s.length === 11 && s.startsWith('09')) return s; // already normalized
  if (s.length === 10 && s.startsWith('9')) return '0' + s; // 917... -> 0917...
  if (s.length === 9) return '09' + s; // 9-digit local -> 09 + s
  if (s.length === 12 && s.startsWith('63')) return '0' + s.slice(2); // 639... -> 09...
  if (s.length === 11 && s.startsWith('63')) return '0' + s.slice(2); // defensive
  return s;
};

export const isValidContact = (value) => /^09\d{9}$/.test(normalizeContact(value));
export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').toString().trim());

export const formatDobForInput = (v) => {
  if (!v) return '';
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch (e) { return ''; }
};

// DOB validation: only ensure a valid date and not in the future. No minimum age enforced.
export const isValidDob = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (date > new Date()) return false; // future date invalid
  return true;
};

export const getDobValidationMessage = (value) => {
  if (!value) return 'Date of Birth is required.';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Please enter a valid date.';
  const now = new Date();
  if (date > now) return 'Date of birth cannot be in the future.';
  return null;
};

export const generatePassword = (nextForm) => {
  const lastName = (nextForm.lastName || '').trim();
  const year = nextForm.dob ? new Date(nextForm.dob).getFullYear() : '1990';
  let pw = `${lastName}${year}`.toLowerCase();
  while (pw.length < 8) {
    pw += Math.floor(Math.random() * 10).toString();
  }
  return pw;
};
