const TRIMESTER_LABELS = ['1st Trimester', '2nd Trimester', '3rd Trimester'];

export function parseMonitoringDateKey(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
  return `${yearText}-${monthText}-${dayText}`;
}

export function toMonitoringDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatMonitoringDate(dateKey, options = { year: 'numeric', month: 'long', day: 'numeric' }) {
  const key = parseMonitoringDateKey(dateKey);
  if (!key) return 'Date unavailable';
  const [year, month, day] = key.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, options).format(new Date(year, month - 1, day));
}

export function getMonitoringMonthDays(month) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDayOffset = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;
  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - firstDayOffset + 1;
    if (day < 1 || day > daysInMonth) return null;
    const date = new Date(year, monthIndex, day);
    return { date, key: toMonitoringDateKey(date) };
  });
}

function getTrimesterIndex(value, fallbackIndex) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('3') || normalized.includes('third')) return 2;
  if (normalized.includes('2') || normalized.includes('second')) return 1;
  if (normalized.includes('1') || normalized.includes('first')) return 0;
  return fallbackIndex;
}

function getCheckupSlots(mother) {
  const checkups = Array.isArray(mother?.checkups) ? mother.checkups : [];
  return checkups.flatMap((trimesterCheckups, trimesterArrayIndex) => {
    const trimesterIndex = getTrimesterIndex(
      Array.isArray(trimesterCheckups)
        ? trimesterCheckups.find((checkup) => checkup?.trimester)?.trimester
        : trimesterCheckups?.trimester,
      trimesterArrayIndex,
    );
    const visits = Array.isArray(trimesterCheckups) ? trimesterCheckups : [trimesterCheckups];
    return visits.map((checkup, checkupArrayIndex) => {
      if (!checkup || typeof checkup !== 'object') return null;
      const checkupNumber = Number(checkup.checkupNumber ?? checkup.checkup_number ?? checkupArrayIndex + 1);
      if (!Number.isInteger(checkupNumber) || checkupNumber < 1 || checkupNumber > 3) return null;
      const actualTrimesterIndex = getTrimesterIndex(checkup.trimester, trimesterIndex);
      const slotIndex = actualTrimesterIndex * 3 + checkupNumber - 1;
      const checkupDate = parseMonitoringDateKey(checkup.checkupDate ?? checkup.checkup_date ?? checkup.visit_date);
      const scheduledDate = parseMonitoringDateKey(checkup.nextCheckupDate ?? checkup.next_checkup_date);
      const trimester = TRIMESTER_LABELS[actualTrimesterIndex] || '';
      return {
        checkup,
        slotIndex,
        checkupNumber,
        trimester,
        checkupDate,
        scheduledDate,
      };
    }).filter(Boolean);
  });
}

function getMotherName(mother) {
  return mother?.name || [
    mother?.firstName ?? mother?.first_name,
    mother?.middleName ?? mother?.middle_name,
    mother?.lastName ?? mother?.last_name,
  ].filter(Boolean).join(' ') || 'Unnamed mother';
}

function getActivityStatus(dateKey, todayKey, completed = false) {
  if (completed) return 'Completed';
  if (dateKey < todayKey) return 'Overdue';
  if (dateKey === todayKey) return 'Pending';
  return 'Scheduled';
}

function createActivity({ mother, date, scheduledDate = '', trimester, checkupNumber, status, kind }) {
  if (!date) return null;
  const motherId = String(mother?.id ?? mother?.motherId ?? mother?.mother_id ?? mother?.motherCode ?? mother?.mother_code ?? '');
  const activity = {
    key: `${motherId}:${date}:${checkupNumber}:${kind}`,
    motherId,
    motherName: getMotherName(mother),
    mother,
    activity: `Check-up ${checkupNumber}`,
    checkupNumber,
    trimester,
    activityDate: date,
    scheduledDate,
    status,
  };
  return activity;
}

export function getMaternalMonitoringActivities(mothers, referenceDate = new Date()) {
  const todayKey = toMonitoringDateKey(referenceDate);
  const activitiesByIdentity = new Map();
  (Array.isArray(mothers) ? mothers : []).forEach((mother) => {
    const slots = getCheckupSlots(mother);
    const slotsByIndex = new Map(slots.map((slot) => [slot.slotIndex, slot]));
    slots.forEach((slot) => {
      if (slot.checkupDate) {
        const activity = createActivity({
          mother,
          date: slot.checkupDate,
          trimester: slot.trimester,
          checkupNumber: slot.checkupNumber,
          status: 'Completed',
          kind: 'completed',
        });
        activitiesByIdentity.set(activity.key, activity);
      }

      if (!slot.scheduledDate || slot.slotIndex >= 8) return;
      const nextSlot = slotsByIndex.get(slot.slotIndex + 1);
      const nextSlotHasCompletion = Boolean(nextSlot?.checkupDate);
      if (nextSlotHasCompletion && nextSlot.checkupDate <= slot.scheduledDate) return;
      const status = nextSlotHasCompletion
        ? 'Missed'
        : getActivityStatus(slot.scheduledDate, todayKey);
      const activity = createActivity({
        mother,
        date: slot.scheduledDate,
        scheduledDate: slot.scheduledDate,
        trimester: TRIMESTER_LABELS[Math.floor((slot.slotIndex + 1) / 3)],
        checkupNumber: ((slot.slotIndex + 1) % 3) + 1,
        status,
        kind: 'scheduled',
      });
      if (!activity) return;

      const matchingCompletion = [...activitiesByIdentity.values()].find((item) => (
        item.motherId === activity.motherId
        && item.activityDate === activity.activityDate
        && item.activity === activity.activity
        && item.trimester === activity.trimester
      ));
      if (matchingCompletion) {
        matchingCompletion.scheduledDate = activity.scheduledDate;
      } else {
        activitiesByIdentity.set(activity.key, activity);
      }
    });
  });
  return [...activitiesByIdentity.values()].sort((left, right) => (
    left.activityDate.localeCompare(right.activityDate)
    || left.motherName.localeCompare(right.motherName)
    || left.activity.localeCompare(right.activity)
  ));
}
