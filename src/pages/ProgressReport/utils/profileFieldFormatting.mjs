export const PRESENCE_PROFILE_FIELDS = new Set([
  'liveBirthDocument',
  'philhealthMember',
  'motherBirthCertificate',
  'programConsentDocument',
]);

export const formatPresenceProfileValue = (field, value) => {
  if (!PRESENCE_PROFILE_FIELDS.has(field)) return null;
  const normalizedValue = String(value ?? '').trim().toLowerCase();
  return ['', '0', 'false', 'no', 'null', 'undefined'].includes(normalizedValue) ? 'No' : 'Yes';
};

export const formatPhilHealthNumberForReport = (value) => (
  String(value ?? '').trim() || 'None'
);

export const formatProfileReportCellValue = (formattedValue) => (
  formattedValue === '—' ? '' : formattedValue
);
