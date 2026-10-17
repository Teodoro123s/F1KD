import { normalizeDateValue } from './dateFormat.js';
import { isValidContactNumber } from './contactNumber.js';

const STANDARD_NAME_PATTERN = /^[\p{L}]+(?:[ '-][\p{L}]+)*$/u;
const MIDDLE_NAME_PATTERN = /^(?:[\p{L}]\.?|[\p{L}]+(?:['-][\p{L}]+)*)$/u;
const SUFFIX_PATTERN = /^[\p{L}\d]+(?:[ .'-][\p{L}\d]+)*\.?$/u;

function isNameValue(value, pattern) {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ');
  return !normalized || pattern.test(normalized);
}

export function getLatestEligibleMotherDob(now = new Date()) {
  const year = now.getFullYear() - 10;
  const month = now.getMonth() + 1;
  const day = Math.min(now.getDate(), new Date(year, month, 0).getDate());
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getMotherIdentityErrors(form, now = new Date()) {
  const errors = {};
  const nameFields = [
    ['firstName', 'First name', STANDARD_NAME_PATTERN],
    ['middleName', 'Middle name', MIDDLE_NAME_PATTERN],
    ['lastName', 'Last name', STANDARD_NAME_PATTERN],
    ['maidenSurname', 'Maiden surname', STANDARD_NAME_PATTERN],
    ['suffix', 'Suffix', SUFFIX_PATTERN],
  ];

  for (const [field, label, pattern] of nameFields) {
    if (!isNameValue(form[field], pattern)) {
      errors[field] = field === 'middleName'
        ? `${label} may be blank or a single initial/full middle name.`
        : `${label} may contain letters, spaces, hyphens, and apostrophes only.`;
    }
  }

  const dob = String(form.dob ?? '').trim();
  if (!dob) {
    errors.dob = 'Date of birth is required.';
  } else {
    const normalized = normalizeDateValue(dob, 'mdy');
    if (!normalized) {
      errors.dob = 'Enter a valid date of birth as MM/DD/YYYY.';
    } else {
      const [year, month, day] = normalized.split('-').map(Number);
      const [todayYear, todayMonth, todayDay] = [
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
      ];
      const age = todayYear - year - (
        todayMonth < month || (todayMonth === month && todayDay < day) ? 1 : 0
      );
      const isInPast = normalized < `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;
      if (!isInPast || age < 10) {
        errors.dob = 'Date of birth must be in the past and indicate an age of at least 10.';
      }
    }
  }

  if (!String(form.contactNumber ?? '').trim()) {
    errors.contactNumber = 'Contact number is required.';
  } else if (!isValidContactNumber(form.contactNumber)) {
    errors.contactNumber = 'Enter exactly 11 digits starting with 09.';
  }

  return errors;
}
