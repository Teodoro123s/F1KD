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
      : ['pending', 'scheduled', 'missing', 'missed', 'overdue', 'not done', 'not_done', 'no'].includes(status)
        ? 'absent'
          : null;
    if (!projects.has(projectId)) {
      projects.set(projectId, {
        id: projectId,
        name: activity.program_name,
        activityDate: activity.activity_date,
        activityCounts: { done: 0, absent: 0 },
      });
    }
    if (countKey) projects.get(projectId).activityCounts[countKey] += 1;
  });
  return [...projects.values()];
};

export const addUnrecordedProgramRecipients = (activities, programs, getRecipients) => {
  const activityGroups = new Map();
  activities.forEach((activity) => {
    const key = `${activity.program_id}:${String(activity.activity_date || '').slice(0, 10)}`;
    const group = activityGroups.get(key) || { programId: String(activity.program_id), date: String(activity.activity_date || '').slice(0, 10), logs: [] };
    group.logs.push(activity);
    activityGroups.set(key, group);
  });

  const unrecordedActivities = [];
  activityGroups.forEach(({ programId, date, logs }) => {
    const program = programs.find((item) => String(item.id) === programId);
    if (!program) return;

    const recordedRecipients = new Set(logs.map((activity) => (
      `${String(activity.beneficiary_type || '').trim().toLowerCase()}:${String(activity.beneficiary_id || '').trim().toLowerCase()}`
    )));
    getRecipients(program).forEach((recipient) => {
      const type = String(recipient.sourceType || '').trim().toLowerCase();
      const id = String(recipient.sourceId ?? '').trim();
      if (!type || !id || recordedRecipients.has(`${type}:${id.toLowerCase()}`)) return;
      unrecordedActivities.push({
        program_id: programId,
        program_name: program.name,
        activity_date: date,
        beneficiary_type: type,
        beneficiary_id: id,
        monitored: 0,
        status: 'Absent',
      });
    });
  });

  return [...activities, ...unrecordedActivities];
};

export const getProjectActivityStatusSummary = (activityCounts = {}) => (
  [
    activityCounts.done ? `Done ${activityCounts.done}` : '',
    activityCounts.absent ? `Absent ${activityCounts.absent}` : '',
  ].filter(Boolean).join(' · ')
);

export const formatActivityDate = (dateKey, options = { year: 'numeric', month: 'long', day: 'numeric' }) => {
  const date = parseLocalDateKey(dateKey);
  return date ? date.toLocaleDateString(undefined, options) : dateKey;
};
