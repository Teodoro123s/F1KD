const getBeneficiaryField = (beneficiaryType) => (beneficiaryType === 'mother' ? 'mother' : 'child');

export function getCsvIdentityFields(fields, beneficiaryType, reportFocus = '') {
  const aggregateField = reportFocus === 'group-school'
    ? 'group'
    : ['batch-group', 'batch-school'].includes(reportFocus) ? 'batch' : '';
  if (aggregateField) {
    const requiredFields = [[aggregateField, aggregateField === 'group' ? 'Group' : 'Batch']];
    const requiredIds = new Set([...requiredFields.map(([id]) => id), 'mother', 'child', 'age', 'gender', 'dateOfBirth']);
    return [
      ...requiredFields,
      ...(fields || []).filter(([id]) => !requiredIds.has(id)),
    ];
  }
  const beneficiaryField = getBeneficiaryField(beneficiaryType);
  const requiredFields = [
    [beneficiaryField, 'Beneficiary Name'],
    ...(beneficiaryType === 'mother' ? [] : [['mother', 'Mother Name']]),
    ['age', beneficiaryType === 'mother' ? 'Age (years)' : 'Age (months)'],
    ...(beneficiaryType === 'mother' ? [] : [['gender', 'Sex']]),
    ['dateOfBirth', 'Date of Birth'],
  ];
  const requiredIds = new Set(requiredFields.map(([id]) => id));
  return [
    ...requiredFields,
    ...(fields || []).filter(([id]) => !requiredIds.has(id)),
  ];
}

export function getCsvIdentityValue(row, field, beneficiaryType, reportFocus = '') {
  if (reportFocus === 'group-school' && field === 'group') return row.group || '';
  if (['batch-group', 'batch-school'].includes(reportFocus) && field === 'batch') return row.batch || '';
  const beneficiaryField = getBeneficiaryField(beneficiaryType);
  if (field === beneficiaryField) {
    return row[beneficiaryField] || row.beneficiaryName || '';
  }
  return row[field];
}

export function buildProgressReportCsv(rows, fields, beneficiaryType, reportFocus, formatValue = (_field, value) => value) {
  const identityFields = getCsvIdentityFields(fields, beneficiaryType, reportFocus);
  const csvValue = (value) => {
    const text = String(value ?? '');
    const safeText = /^[\u0000-\u0020\uFEFF]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replaceAll('"', '""')}"`;
  };
  return [
    identityFields.map(([, label]) => csvValue(label)).join(','),
    ...rows.map((row) => identityFields.map(([id]) => (
      csvValue(formatValue(id, getCsvIdentityValue(row, id, beneficiaryType, reportFocus)))
    )).join(',')),
  ].join('\r\n');
}
