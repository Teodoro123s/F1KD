const escapeCsvValue = (value) => {
  const text = String(value ?? '');
  const safeText = /^[\u0000-\u0020\uFEFF]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
};

const uniqueFields = (fields) => [...new Set(fields)];

export function buildAiReportCsv({
  rows,
  proposal,
  selection,
  fieldLabels,
  formatValue = (_field, value) => value,
  getValue = (row, _point, field) => row[field],
}) {
  const identityFields = proposal.beneficiaryType === 'mother'
    ? ['mother', 'age', 'dateOfBirth']
    : ['child', 'mother', 'age', 'gender', 'dateOfBirth'];
  const communityFields = selection.groupId
    ? selection.batchId ? [] : ['batch']
    : ['group', 'batch'];
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
    ? rows.flatMap((row) => (row.growthSeries?.length ? row.growthSeries : [null])
      .map((point) => ({ row, point })))
    : rows.map((row) => ({ row, point: null }));
  const formattedRows = csvRows.map(({ row, point }) => fields.map((field) => (
    formatValue(field, getValue(row, point, field))
  )));
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
