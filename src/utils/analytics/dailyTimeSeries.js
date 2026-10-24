export function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getRollingDateRange(days = 30, now = new Date()) {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - Math.max(0, days - 1));
  return { from: toLocalDateKey(start), to: toLocalDateKey(end) };
}

export function fillDailyTimeSeries(rows = [], from, to) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to || '') || from > to) return [];

  const countsByDate = new Map();
  rows.forEach((row) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row?.date || '')) return;
    countsByDate.set(row.date, (countsByDate.get(row.date) || 0) + (Number(row.count) || 0));
  });

  const result = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10);
    result.push({ date, count: countsByDate.get(date) || 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}
