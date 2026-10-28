export const toLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseLocalDateKey = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
};

export const getMonthCalendarDays = (month) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const dayOffset = firstDay.getDay();
  const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return Array.from({ length: Math.ceil((dayOffset + dayCount) / 7) * 7 }, (_, index) => {
    const dayOfMonth = index - dayOffset + 1;
    if (dayOfMonth < 1 || dayOfMonth > dayCount) return null;
    const date = new Date(month.getFullYear(), month.getMonth(), dayOfMonth);
    return { date, key: toLocalDateKey(date) };
  });
};

export const getDistinctProjectsForDate = (activities, dateKey) => {
  const projects = new Map();
  activities.forEach((activity) => {
    if (String(activity.activity_date || '').slice(0, 10) !== dateKey) return;
    const projectId = String(activity.program_id);
    const status = String(activity.status || '').trim().toLowerCase();
    const countKey = ['done', 'completed'].includes(status)
      ? 'done'
      : ['pending', 'scheduled'].includes(status)
        ? 'pending'
        : ['missing', 'missed', 'overdue'].includes(status)
          ? 'missing'
          : null;
    if (!projects.has(projectId)) {
      projects.set(projectId, {
        id: projectId,
        name: activity.program_name,
        activityDate: activity.activity_date,
        activityCounts: { done: 0, pending: 0, missing: 0 },
      });
    }
    if (countKey) projects.get(projectId).activityCounts[countKey] += 1;
  });
  return [...projects.values()];
};

export const getProjectActivityStatusSummary = (activityCounts = {}) => (
  [
    activityCounts.done ? `Done ${activityCounts.done}` : '',
    activityCounts.pending ? `Pending ${activityCounts.pending}` : '',
    activityCounts.missing ? `Missing ${activityCounts.missing}` : '',
  ].filter(Boolean).join(' · ')
);

export const formatActivityDate = (dateKey, options = { year: 'numeric', month: 'long', day: 'numeric' }) => {
  const date = parseLocalDateKey(dateKey);
  return date ? date.toLocaleDateString(undefined, options) : dateKey;
};
