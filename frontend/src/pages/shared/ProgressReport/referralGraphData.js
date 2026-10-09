export const REFERRAL_GRAPH_FIELDS = [
  ['labAssistanceProvided', 'Lab assistance', 'pie'],
  ['assistanceAmount', 'Assistance amount', 'histogram'],
  ['sourceOfFunds', 'Source of funds', 'pie'],
  ['facilityType', 'Facility type', 'pie'],
  ['referralMonth', 'Referrals by month', 'bar'],
];

export function isReferralRecorded(value) {
  return value === true || value === 1 || value === '1' || String(value).trim().toLowerCase() === 'true';
}

export function collectReferralVisits(rows = []) {
  return rows.flatMap((row) => (row.growthSeries || [])
    .filter((point) => isReferralRecorded(point.hospitalReferral))
    .map((point, index) => ({
      ...point,
      beneficiary: row.mother || 'Unknown beneficiary',
      key: `${row.motherId || row.mother || 'mother'}-${point.date || index}`,
    })))
    .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
}

export function filterReferralRowsByMonth(rows = [], displayWeeks = 'all') {
  const range = String(displayWeeks || '').startsWith('range:')
    ? String(displayWeeks).slice(6).split(':')
    : null;
  if (!range?.[0] || !range?.[1]) return rows;

  return rows.map((row) => ({
    ...row,
    growthSeries: (row.growthSeries || []).filter((point) => {
      if (!point.date) return false;
      const date = new Date(point.date);
      if (Number.isNaN(date.getTime())) return false;
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return month >= range[0] && month <= range[1];
    }),
  }));
}

function getFieldValue(visit, field) {
  if (field === 'labAssistanceProvided') {
    if (visit.labAssistanceProvided === null || visit.labAssistanceProvided === undefined || visit.labAssistanceProvided === '') return 'Not recorded';
    return isReferralRecorded(visit.labAssistanceProvided) ? 'Yes' : 'No';
  }
  if (field === 'referralMonth') {
    if (!visit.date) return 'Date not recorded';
    const date = new Date(visit.date);
    return Number.isNaN(date.getTime()) ? 'Date not recorded' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  return String(visit[field] ?? '').trim() || 'Not recorded';
}

export function countReferralCategories(visits, field) {
  const totals = new Map();
  visits.forEach((visit) => {
    const label = getFieldValue(visit, field);
    totals.set(label, (totals.get(label) || 0) + 1);
  });
  return [...totals.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export function getReferralMonthCounts(visits) {
  return countReferralCategories(visits, 'referralMonth')
    .sort((left, right) => left.label.localeCompare(right.label))
    .map(({ label, count }) => ({
      label: label === 'Date not recorded'
        ? label
        : new Date(Number(label.slice(0, 4)), Number(label.slice(5, 7)) - 1, 1)
          .toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
      count,
    }));
}

export function buildAssistanceAmountBins(visits) {
  const amounts = visits
    .map((visit) => visit.assistanceAmount)
    .filter((amount) => amount !== null && amount !== undefined && amount !== '')
    .map(Number)
    .filter((amount) => Number.isFinite(amount) && amount >= 0);
  if (!amounts.length) return { bins: [], includedCount: 0, excludedCount: visits.length };

  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const binCount = min === max ? 1 : Math.min(8, Math.max(3, Math.ceil(Math.sqrt(amounts.length))));
  const step = min === max ? 1 : (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    start: min + index * step,
    end: min === max ? max : index === binCount - 1 ? max : min + (index + 1) * step,
    count: 0,
  }));

  amounts.forEach((amount) => {
    const index = min === max ? 0 : Math.min(binCount - 1, Math.floor((amount - min) / step));
    bins[index].count += 1;
  });
  return { bins, includedCount: amounts.length, excludedCount: visits.length - amounts.length };
}
