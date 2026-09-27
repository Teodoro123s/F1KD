/**
 * Formats a raw date entry as a YYYY/MM/DD-style string while accepting digits only.
 *
 * @param {string | number | Date | null | undefined} value - The raw input value.
 * @returns {string} The masked date string, such as 2026/09/24.
 */
export function maskDateInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}/${digits.slice(4)}`;
  return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6, 8)}`;
}

/**
 * Normalizes a partially typed date while the user is editing it.
 *
 * Examples:
 * - 2026 -> 2026
 * - 2026/09 -> 2026-09
 * - 2026/09/24 -> 2026-09-24
 *
 * The function keeps incomplete values available while typing, but still validates
 * and returns an empty string for impossible values.
 */
export function normalizeDateValue(value) {
  const raw = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  if (!raw) return '';

  const masked = maskDateInput(raw);
  if (!masked) return '';

  const [yearPart, monthPart, dayPart] = masked.split('/');
  const year = yearPart || '';
  const month = monthPart || '';
  const day = dayPart || '';

  if (!year) return '';
  if (year.length !== 4) return '';
  if (!month && !day) return year;
  if (!day && month.length >= 1 && month.length <= 2) return `${year}-${month}`;
  if (month && !day) return `${year}-${month}`;
  if (month.length !== 2 || day.length !== 2) return `${year}-${month || ''}${day ? `-${day}` : ''}`.replace(/-+$/, '');

  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) {
    return '';
  }

  return `${year}-${month}-${day}`;
}

/**
 * Converts user input or stored database values into a form-friendly YYYY-MM-DD string.
 *
 * @param {string | number | Date | null | undefined} value - The value to normalize.
 * @returns {string} A browser-friendly date string, or an empty string when invalid.
 */
export function formatDateForInput(value) {
  if (!value) return '';
  const candidate = String(value).trim();
  const isoDate = candidate.replace(/\//g, '-');
  const dateOnly = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
  const partial = normalizeDateValue(candidate);
  if (partial) return partial;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Returns a readable display version of a date in YYYY/MM/DD format.
 *
 * @param {string | number | Date | null | undefined} value - The date to display.
 * @returns {string} A formatted display date or a fallback placeholder.
 */
export function formatDateForDisplay(value) {
  if (value === null || value === undefined || value === '') return '—';

  const candidate = String(value).trim();
  if (!candidate) return '—';

  const normalized = normalizeDateValue(candidate);
  if (normalized) {
    const [year, month, day] = normalized.split('-');
    if (year && month && day) return `${year}/${month}/${day}`;
    if (year && month) return `${year}/${month}`;
    return year || '—';
  }

  const raw = formatDateForInput(candidate);
  if (!raw) return candidate;
  const [year, month, day] = raw.split('-');
  if (year && month && day) return `${year}/${month}/${day}`;
  if (year && month) return `${year}/${month}`;
  return year || '—';
}