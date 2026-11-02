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

export const hasProfileReportValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.some(hasProfileReportValue);
  if (typeof value === 'object') return Object.values(value).some(hasProfileReportValue);
  return true;
};
