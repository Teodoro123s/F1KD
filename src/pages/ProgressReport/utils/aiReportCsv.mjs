const escapeCsvValue = (value) => {
  const text = String(value ?? '');
  const safeText = /^[\u0000-\u0020\uFEFF]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
};

const uniqueFields = (fields) => [...new Set(fields)];

const INSIGHT_CATEGORICAL_VALUES = {
  gender: ['Male', 'Female', 'Other'],
  developmentalStatus: ['Normal', 'Needs Follow-up', 'At Risk'],
  hospitalReferral: ['Yes', 'No'],
  exclusiveBreastfeeding: ['Yes', 'No'],
};
const INSIGHT_NUMERIC_FIELDS = new Set([
  'age',
  'ageAtCheckupMonths',
  'assistanceAmount',
  'bmi',
  'fetalHeartRate',
  'fundalHeight',
  'height',
  'initialHeight',
  'initialWeight',
  'weight',
]);

function buildInsightContext(csvRows, fields, proposal, getValue) {
  const categorical = Object.entries(INSIGHT_CATEGORICAL_VALUES).flatMap(([fieldId, allowedValues]) => {
    if (!fields.includes(fieldId)) return [];
    const counts = new Map(allowedValues.map((value) => [value, 0]));
    csvRows.forEach(({ row, point }) => {
      const rawValue = getValue(row, point, fieldId);
      const value = typeof rawValue === 'boolean' ? (rawValue ? 'Yes' : 'No') : String(rawValue ?? '').trim();
      const canonicalValue = allowedValues.find((allowed) => allowed.toLowerCase() === value.toLowerCase());
      if (canonicalValue) counts.set(canonicalValue, counts.get(canonicalValue) + 1);
    });
    return [{
      fieldId,
      counts: [...counts].filter(([, count]) => count > 0)
        .map(([value, count]) => ({ value, count }))
        .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value)),
    }];
  });

  const numeric = [...INSIGHT_NUMERIC_FIELDS].flatMap((fieldId) => {
    if (!fields.includes(fieldId)) return [];
    const values = csvRows
      .map(({ row, point }) => {
        const value = getValue(row, point, fieldId);
        return value === null || value === undefined || value === '' ? null : Number(value);
      })
      .filter(Number.isFinite);
    if (!values.length) return [];
    const total = values.reduce((sum, value) => sum + value, 0);
    return [{
      fieldId,
      count: values.length,
      min: values.reduce((minimum, value) => Math.min(minimum, value), Infinity),
      max: values.reduce((maximum, value) => Math.max(maximum, value), -Infinity),
      average: Number((total / values.length).toFixed(2)),
    }];
  });

  const monthlyCounts = new Map();
  if (fields.includes('measurementDate')) {
    csvRows.forEach(({ row, point }) => {
      const match = String(getValue(row, point, 'measurementDate') || '').match(/^(\d{4}-\d{2})/);
      if (match) monthlyCounts.set(match[1], (monthlyCounts.get(match[1]) || 0) + 1);
    });
  }

  return {
    reportCategory: proposal.reportCategory,
    beneficiaryType: proposal.beneficiaryType,
    rowCount: csvRows.length,
    categorical,
    numeric,
    monthly: [...monthlyCounts].sort(([left], [right]) => left.localeCompare(right))
      .map(([month, count]) => ({ month, count })),
  };
}

export function isLatestCheckupRequest(prompt) {
  return /\b(?:latest|most recent)\b|\blast(?:\s+(?:check[\s-]?up|visit|measurement|bmi|record(?:ed)?|report|reading))\b/i
    .test(String(prompt || ''));
}

export function getMotherCheckupSlot(prompt) {
  const match = String(prompt || '').match(/\bT([1-3])\s*[- ]?\s*C([1-3])\b/i);
  if (!match) return null;
  return { trimester: Number(match[1]), checkupNumber: Number(match[2]) };
}

export function getAgeAtCheckupMonths(dateOfBirth, checkupDate) {
  const parseDate = (value) => {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const [, year, month, day] = match;
    return { year: Number(year), month: Number(month), day: Number(day) };
  };
  const birth = parseDate(dateOfBirth);
  const checkup = parseDate(checkupDate);
  if (!birth || !checkup) return '';

  let months = (checkup.year - birth.year) * 12 + checkup.month - birth.month;
  if (checkup.day < birth.day) months -= 1;
  return months < 0 ? '' : months;
}

export function buildAiReportCsv({
  rows,
  proposal,
  selection,
  fieldLabels,
  latestCheckupOnly = false,
  motherCheckupSlot = null,
  formatValue = (_field, value) => value,
  getValue = (row, _point, field) => row[field],
}) {
  const identityFields = proposal.beneficiaryType === 'mother'
    ? ['mother', 'age', 'dateOfBirth']
    : [
      'child',
      'mother',
      ...(proposal.reportCategory === 'monitor' ? ['ageAtCheckupMonths'] : ['age']),
      'gender',
      'dateOfBirth',
    ];
  const communityFields = [
    ...(!selection.schoolId ? ['school'] : []),
    ...(selection.groupId ? selection.batchId ? [] : ['batch'] : ['group', 'batch']),
  ];
  const requestedFields = proposal.reportCategory === 'monitor'
    ? [
      ...(proposal.profileMetricIds || []),
      'measurementDate',
      ...proposal.metricIds.filter((field) => field !== 'measurementDate'),
    ]
    : proposal.metricIds;
  const fields = uniqueFields([...communityFields, ...identityFields, ...requestedFields]);
  if (
    proposal.reportCategory === 'monitor'
    && !rows.some((row) => row.measurementDate || row.growthSeries?.length)
  ) {
    throw new Error('No monitoring check-ups were found for this scope. Try a Profile Report or record monitoring visits first.');
  }
  const csvRows = proposal.reportCategory === 'monitor'
    ? rows.flatMap((row) => {
      let points = row.growthSeries?.length ? row.growthSeries : [null];
      if (proposal.beneficiaryType === 'mother' && motherCheckupSlot) {
        points = points.filter((point) => {
          const trimester = String(point?.trimester || '').toLowerCase();
          const trimesterNumber = trimester.includes('3') || trimester.includes('third') ? 3
            : trimester.includes('2') || trimester.includes('second') ? 2
              : trimester.includes('1') || trimester.includes('first') ? 1 : null;
          return trimesterNumber === motherCheckupSlot.trimester
            && Number(point?.checkupNumber) === motherCheckupSlot.checkupNumber;
        });
      }
      if (!points.length) return [];
      if (!latestCheckupOnly) return points.map((point) => ({ row, point }));

      const latestPoint = points
        .filter((point) => point && (point.date || point.measurementDate))
        .sort((left, right) => String(right.date || right.measurementDate)
          .localeCompare(String(left.date || left.measurementDate)))[0] || null;
      return [{ row, point: latestPoint }];
    })
    : rows.map((row) => ({ row, point: null }));
  if (motherCheckupSlot && csvRows.length === 0) {
    throw new Error(
      `No maternal check-up was recorded for trimester ${motherCheckupSlot.trimester}, check-up ${motherCheckupSlot.checkupNumber} in this scope.`,
    );
  }
  const formattedRows = csvRows.map(({ row, point }) => fields.map((field) => {
    const value = formatValue(field, getValue(row, point, field));
    return field.endsWith('Interpretation') && typeof value === 'string'
      ? value.trim().replace(/\s+/g, ' ')
      : value;
  }));
  const csv = [
    fields.map((field) => escapeCsvValue(fieldLabels.get(field) || field)).join(','),
    ...formattedRows.map((values) => values.map(escapeCsvValue).join(',')),
  ].join('\r\n');
  const filename = `progress-report-ai-${proposal.reportCategory}-${proposal.beneficiaryType}.csv`;
  const insightContext = buildInsightContext(csvRows, fields, proposal, getValue);

  return {
    csv,
    filename,
    fields,
    previewRows: formattedRows.slice(0, 20),
    rowCount: csvRows.length,
    insightContext,
  };
}

export function downloadAiReportCsv(csv, filename) {
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
