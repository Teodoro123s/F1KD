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
  const s = String(v).trim();
  const match = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  } catch (e) { return ''; }
};

// DOB validation: only ensure a valid date and not in the future. No minimum age enforced.
export const getDobValidationMessage = (value) => {
  if (!value) return 'Date of Birth is required.';
  const s = String(value).trim();
  const match = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) {
      return 'Please enter a valid date.';
    }
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    const curDay = today.getDate();
    if (year > curYear || (year === curYear && (month > curMonth || (month === curMonth && day > curDay)))) {
      return 'Date of birth cannot be in the future.';
    }
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Please enter a valid date.';
  const now = new Date();
  if (date > now) return 'Date of birth cannot be in the future.';
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
