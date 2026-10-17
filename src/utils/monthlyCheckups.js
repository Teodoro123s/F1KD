function getCheckupDate(checkup) {
  return checkup?.checkupDate ?? checkup?.checkup_date ?? checkup?.visit_date;
}

function isInMonth(dateValue, year, month) {
  const match = String(dateValue ?? '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const [, yearText, monthText, dayText] = match;
  const checkupYear = Number(yearText);
  const checkupMonth = Number(monthText);
  const checkupDay = Number(dayText);
  const date = new Date(Date.UTC(checkupYear, checkupMonth - 1, checkupDay));

  return date.getUTCFullYear() === checkupYear
    && date.getUTCMonth() + 1 === checkupMonth
    && date.getUTCDate() === checkupDay
    && checkupYear === year
    && checkupMonth === month;
}

export function hasCheckupThisMonth(beneficiary = {}, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const checkups = Array.isArray(beneficiary.checkups) ? beneficiary.checkups.flat(Infinity) : [];

  return checkups.some((checkup) => (
    checkup && typeof checkup === 'object'
      && isInMonth(getCheckupDate(checkup), year, month)
  ));
}
