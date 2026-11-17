export function getNotificationDateGroup(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Earlier';
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDifference = Math.round((startOfToday - startOfDate) / 86400000);
  if (dayDifference === 0) return 'Today';
  if (dayDifference === 1) return 'Yesterday';
  return 'Earlier';
}

export function formatRelativeTimestamp(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '—';
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const unit = units.find(([, size]) => Math.abs(seconds) >= size);
  if (!unit) return relativeTime.format(seconds, 'second');
  return relativeTime.format(Math.round(seconds / unit[1]), unit[0]);
}

