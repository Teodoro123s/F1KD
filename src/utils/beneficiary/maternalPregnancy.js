const daysInMonth = (year, monthIndex) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

export function calculateNaegeleEdd(value) {
  const match = String(value ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const monthIndex = Number(monthValue) - 1;
  const day = Number(dayValue);
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > daysInMonth(year, monthIndex)) return '';

  let targetYear = year + 1;
  let targetMonth = monthIndex;
  const anniversaryDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  targetMonth -= 3;
  while (targetMonth < 0) {
    targetMonth += 12;
    targetYear -= 1;
  }
  const edd = new Date(Date.UTC(
    targetYear,
    targetMonth,
    Math.min(anniversaryDay, daysInMonth(targetYear, targetMonth)) + 7,
  ));
  return `${edd.getUTCFullYear()}-${String(edd.getUTCMonth() + 1).padStart(2, '0')}-${String(edd.getUTCDate()).padStart(2, '0')}`;
}
