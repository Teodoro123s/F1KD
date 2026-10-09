export const PROGRAM_GRAPH_BREAKDOWNS = [
  ['beneficiary', 'Beneficiary'],
  ['group', 'Group'],
  ['batch', 'Batch'],
  ['school', 'School'],
];

function getBreakdown(row, breakdown, beneficiaryType, index) {
  if (breakdown === 'beneficiary') {
    const person = beneficiaryType === 'mother'
      ? { id: row.motherId, name: row.mother }
      : beneficiaryType === 'child'
        ? { id: row.childId, name: row.child }
        : { id: row.childId || row.motherId, name: row.child || row.mother };
    return {
      key: String(person.id || person.name || `beneficiary-${index}`),
      label: person.name || 'Unnamed beneficiary',
    };
  }

  const label = String(row[breakdown] || '').trim() || `Unassigned ${breakdown}`;
  const idField = `${breakdown}Id`;
  return { key: String(row[idField] || label), label };
}

export function aggregateProgramGraphRows(rows = [], metric, breakdown = 'beneficiary', beneficiaryType = 'child') {
  const totals = new Map();
  rows.forEach((row, index) => {
    const value = Number(row[metric]);
    if (!Number.isFinite(value)) return;

    const { key, label } = getBreakdown(row, breakdown, beneficiaryType, index);
    const current = totals.get(key) || { label, sum: 0, count: 0 };
    current.sum += value;
    current.count += 1;
    totals.set(key, current);
  });

  const isAverageMetric = metric === 'receivedBenefitAveragePerMonth';
  return [...totals.entries()]
    .map(([key, item]) => ({
      key,
      label: item.label,
      value: isAverageMetric ? item.sum / item.count : item.sum,
      count: item.count,
    }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
}
