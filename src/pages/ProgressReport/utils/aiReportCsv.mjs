const escapeCsvValue = (value) => {
  const text = String(value ?? '');
  const safeText = /^[\u0000-\u0020\uFEFF]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
};

const uniqueFields = (fields) => [...new Set(fields)];

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

  return {
    csv,
    filename,
    fields,
    previewRows: formattedRows.slice(0, 20),
    rowCount: csvRows.length,
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
