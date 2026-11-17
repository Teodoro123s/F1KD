export function formatReportDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return {
    date: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date),
    time: new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date),
    iso: date.toISOString(),
  };
}

export function formatReportAction(action) {
  if (action === 'sign_in') return 'Signed in';
  return String(action || '')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toLocalDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getReportDateRange(preset) {
  if (preset === 'all') return { from: '', to: '' };
  const today = new Date();
  const end = toLocalDateInputValue(today);
  const daysBack = preset === 'week' ? 6 : preset === 'month' ? 29 : 0;
  today.setDate(today.getDate() - daysBack);
  return { from: toLocalDateInputValue(today), to: end };
}

export function exportReportCsv(rows, fields, filename) {
  const csv = [
    fields.map((field) => field.label),
    ...rows.map((row) => fields.map(({ key }) => row[key] ?? '')),
  ].map((line) => line.map((value) => {
    const text = String(value);
    const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
