export function formatDateForInput(value) {
  if (!value) return '';
  const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
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