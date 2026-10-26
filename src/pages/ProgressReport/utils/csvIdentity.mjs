const getBeneficiaryField = (beneficiaryType) => (beneficiaryType === 'mother' ? 'mother' : 'child');

export function getCsvIdentityFields(fields, beneficiaryType) {
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

export function getCsvIdentityValue(row, field, beneficiaryType) {
  const beneficiaryField = getBeneficiaryField(beneficiaryType);
  if (field === beneficiaryField) {
    return row[beneficiaryField] || row.beneficiaryName || '';
  }
  return row[field];
}

const getCsvHeaderLabel = (field, label) => {
  const monthField = String(field).match(/^(\d{4})-(\d{2})(Interpretation)?$/);
  if (!monthField) return label;

  const [, year, month, interpretation] = monthField;
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(Number(year), Number(month) - 1, 1)));
  return `BMI ${monthName} ${year}${interpretation ? ' Interpretation' : ''}`;
};

export function buildProgressReportCsv(rows, fields, beneficiaryType, formatValue = (_field, value) => value) {
  const identityFields = getCsvIdentityFields(fields, beneficiaryType);
  const csvValue = (value) => {
    const text = String(value ?? '');
    const safeText = /^[\u0000-\u0020\uFEFF]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replaceAll('"', '""')}"`;
  };
  return [
    identityFields.map(([id, label]) => csvValue(getCsvHeaderLabel(id, label))).join(','),
    ...rows.map((row) => identityFields.map(([id]) => (
      csvValue(formatValue(id, getCsvIdentityValue(row, id, beneficiaryType)))
    )).join(',')),
  ].join('\r\n');
}
