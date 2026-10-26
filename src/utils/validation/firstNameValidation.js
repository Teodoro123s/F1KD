const FIRST_NAME_WORD = String.raw`(?:Ma\.|[\p{L}][\p{L}\p{M}]*(?:[-'’][\p{L}][\p{L}\p{M}]*)*)`;
const FIRST_NAME_PATTERN = new RegExp(`^${FIRST_NAME_WORD}(?: ${FIRST_NAME_WORD})*$`, 'iu');

export const FIRST_NAME_MIN_LENGTH = 2;
export const FIRST_NAME_MAX_LENGTH = 50;
export const FIRST_NAME_INVALID_MESSAGE = 'First name must be 2–50 characters and may contain letters, spaces, internal hyphens or apostrophes; “Ma.” is allowed.';

export function normalizeFirstName(value) {
  return String(value ?? '').trim().replace(/\s+/gu, ' ');
}

export function getFirstNameValidationError(value) {
  const normalized = normalizeFirstName(value);
  if (!normalized) return 'First name is required.';

  const length = [...normalized.normalize('NFC')].length;
  if (length < FIRST_NAME_MIN_LENGTH) return 'First name must be at least 2 characters.';
  if (length > FIRST_NAME_MAX_LENGTH) return 'First name must be no more than 50 characters.';
  if (!FIRST_NAME_PATTERN.test(normalized)) return FIRST_NAME_INVALID_MESSAGE;
  return '';
}

export function isValidFirstName(value) {
  return !getFirstNameValidationError(value);
}
