/**
 * Formats a raw date entry as a DD/MM/YYYY-style input mask while accepting digits only.
 *
 * @param {string | number | Date | null | undefined} value - The raw input value.
 * @returns {string} The masked date string, such as 24/09/2026.
 */
export function maskDateInput(value, order = 'dmy') {
  const candidate = String(value ?? '').trim();
  const isoDate = candidate.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    return order === 'mdy' ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
  }
  const explicitDate = candidate.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (explicitDate) {
    const [, first, second, year] = explicitDate;
    const month = (order === 'mdy' ? first : second).padStart(2, '0');
    const day = (order === 'mdy' ? second : first).padStart(2, '0');
    return order === 'mdy' ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
  }
  const partialDateParts = candidate.split(/[/-]/);
  if (partialDateParts.length > 1
    && partialDateParts.length <= 3
    && partialDateParts.every((part, index) => /^\d*$/.test(part) && part.length <= [2, 2, 4][index])) {
    return partialDateParts.join('/');
  }
  const digits = candidate.replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

/**
 * Normalizes a partially typed date while the user is editing it.
 *
 * Accepts DD/MM/YYYY input and legacy YYYY/MM/DD or ISO values, returning ISO dates.
 */
export function normalizeDateValue(value, order = 'dmy') {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const yearFirst = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  const dayFirst = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const digits = raw.replace(/\D/g, '');
  let year;
  let month;
  let day;

  if (yearFirst) {
    [, year, month, day] = yearFirst;
  } else if (dayFirst) {
    const [, first, second, parsedYear] = dayFirst;
    year = parsedYear;
    month = order === 'mdy' ? first : second;
    day = order === 'mdy' ? second : first;
  } else if (/^\d{8}$/.test(digits)) {
    if (Number(digits.slice(0, 4)) >= 1900) {
      year = digits.slice(0, 4);
      month = digits.slice(4, 6);
      day = digits.slice(6, 8);
    } else if (order === 'mdy') {
      month = digits.slice(0, 2);
      day = digits.slice(2, 4);
      year = digits.slice(4, 8);
    } else {
      day = digits.slice(0, 2);
      month = digits.slice(2, 4);
      year = digits.slice(4, 8);
    }
  } else {
    return '';
  }

  if (Number(month) < 1 || Number(month) > 12) return '';
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (date.getFullYear() !== Number(year)
    || date.getMonth() !== Number(month) - 1
    || date.getDate() !== Number(day)) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getDateInputError(value, { min, max, required = false, order = 'dmy' } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) return required ? 'Date is required.' : '';

  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return `Enter the date as ${order === 'mdy' ? 'MM/DD/YYYY' : 'DD/MM/YYYY'}.`;

  const [, first, second, year] = match;
  const month = order === 'mdy' ? first : second;
  const day = order === 'mdy' ? second : first;
  const dayNumber = Number(day);
  const monthNumber = Number(month);
  const yearNumber = Number(year);
  if (monthNumber < 1 || monthNumber > 12) return 'Month must be between 01 and 12.';
  if (yearNumber < 1) return 'Enter a valid year.';
  const isLeapYear = yearNumber % 4 === 0 && (yearNumber % 100 !== 0 || yearNumber % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][monthNumber - 1];
  if (dayNumber < 1 || dayNumber > daysInMonth) {
    return `Day must be between 01 and ${String(daysInMonth).padStart(2, '0')} for this month and year.`;
  }

  const normalized = `${year}-${month}-${day}`;
  const minimum = min ? normalizeDateValue(min) : '';
  const maximum = max ? normalizeDateValue(max) : '';
  if (minimum && normalized < minimum) return `Date cannot be before ${formatDateForDisplay(minimum)}.`;
  if (maximum && normalized > maximum) return 'Date cannot be in the future.';
  return '';
}

/**
 * Converts user input or stored database values into a form-friendly YYYY-MM-DD string.
 *
 * @param {string | number | Date | null | undefined} value - The value to normalize.
 * @returns {string} A browser-friendly date string, or an empty string when invalid.
 */
export function formatDateForInput(value) {
  if (!value) return '';
  if (value instanceof Date) return normalizeDateValue(value);
  const candidate = String(value).trim();
  const isoDate = candidate.replace(/\//g, '-');
  const dateOnly = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) return normalizeDateValue(`${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`);
  const normalized = normalizeDateValue(candidate);
  if (normalized) return normalized;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatDateTimeForDisplay(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function addMonthsPreservingDay(value, monthOffset = 1, preferredDay) {
  const normalized = normalizeDateValue(value);
  if (!normalized || !Number.isInteger(monthOffset)) return '';

  const [year, month, day] = normalized.split('-').map(Number);
  const targetMonthIndex = year * 12 + month - 1 + monthOffset;
  const targetYear = Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex - targetYear * 12;
  const anchorDay = Number.isInteger(Number(preferredDay)) ? Number(preferredDay) : day;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(Math.max(anchorDay, 1), lastDay);

  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

/**
 * Returns a readable display version of a date in DD/MM/YYYY format.
 *
 * @param {string | number | Date | null | undefined} value - The date to display.
 * @returns {string} A formatted display date or a fallback placeholder.
 */
export function formatDateForDisplay(value) {
  if (value === null || value === undefined || value === '') return '—';

  const candidate = String(value).trim();
  if (!candidate) return '—';

  const raw = formatDateForInput(value);
  if (!raw) return '—';
  const [year, month, day] = raw.split('-');
  return year && month && day ? `${day}/${month}/${year}` : candidate;
}

export function formatDateMaskValue(value) {
  return maskDateInput(value);
}

export function normalizeMaskedDate(value) {
  return normalizeDateValue(value);
}