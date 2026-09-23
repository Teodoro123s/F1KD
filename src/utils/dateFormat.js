export function maskDateInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}/${digits.slice(4)}`;
  return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6, 8)}`;
}

export function normalizeDateValue(value) {
  const masked = maskDateInput(value);
  if (!masked) return '';
  const [year, month, day] = masked.split('/');
  if (!year || !month || !day || year.length !== 4 || month.length !== 2 || day.length !== 2) return '';
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) return '';
  return `${year}-${month}-${day}`;
}

export function formatDateForInput(value) {
  if (!value) return '';
  const candidate = String(value).trim();
  const isoDate = candidate.replace(/\//g, '-');
  const dateOnly = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
  const normalized = normalizeDateValue(candidate);
  if (normalized) return normalized;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatDateForDisplay(value) {
  const inputDate = formatDateForInput(value);
  if (!inputDate) return value || '—';
  const [year, month, day] = inputDate.split('-');
  return `${year}/${month}/${day}`;
}