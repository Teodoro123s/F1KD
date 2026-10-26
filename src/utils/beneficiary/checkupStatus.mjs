const getDateOnly = (value) => {
  const match = String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return '';

  const [year, month, day] = match[1].split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    ? match[1]
    : '';
};

const getLatestNextCheckupDate = (beneficiary) => {
  const checkups = Array.isArray(beneficiary.checkups)
    ? beneficiary.checkups.flat(Infinity).filter((checkup) => checkup && typeof checkup === 'object')
    : [];
  const datedCheckups = checkups
    .map((checkup, index) => ({
      checkup,
      index,
      date: getDateOnly(checkup.checkupDate ?? checkup.checkup_date ?? checkup.visit_date),
    }))
    .filter(({ date }) => date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.index - b.index);

  if (datedCheckups.length) {
    const latestCheckup = datedCheckups[datedCheckups.length - 1].checkup;
    return getDateOnly(latestCheckup.nextCheckupDate ?? latestCheckup.next_checkup_date);
  }

  return getDateOnly(beneficiary.nextCheckupDate ?? beneficiary.next_checkup_date);
};

export function getCheckupScheduleStatus(beneficiary = {}, now = new Date()) {
  const nextCheckupDate = getLatestNextCheckupDate(beneficiary);
  if (!nextCheckupDate) return 'Pending';

  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

  return nextCheckupDate < today ? 'Missing' : 'Pending';
}
