export function normalizeDevelopmentalStatus(value) {
  const status = String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  if (status === 'normal' || status === 'at risk' || status === 'needs follow up') return status;
  return '';
}

export function getMonthlyDevelopmentalStatus(beneficiary) {
  const checkups = (Array.isArray(beneficiary?.checkups) ? beneficiary.checkups.flat(3) : [])
    .filter((checkup) => checkup && typeof checkup === 'object')
    .map((checkup) => normalizeDevelopmentalStatus(checkup.developmentalStatus ?? checkup.developmental_status));
  return checkups.slice(-2).reverse().find(Boolean) ?? '';
}

export function getMonitoringScreeningRoute(beneficiaryType, screeningStatus) {
  const normalizedType = beneficiaryType === 'Child' ? 'Child' : 'Mother';
  const normalizedStatus = normalizeDevelopmentalStatus(screeningStatus);
  if (!['at risk', 'needs follow up'].includes(normalizedStatus)) {
    throw new TypeError('A valid non-normal screening status is required');
  }
  const label = normalizedStatus === 'needs follow up' ? 'Needs Follow-up' : 'At Risk';
  return `/monitoring?beneficiaryType=${normalizedType}&screening=${encodeURIComponent(label)}`;
}

export function getMonitoringScreeningRouteFilters(search) {
  const params = new URLSearchParams(search);
  const beneficiaryType = params.get('beneficiaryType');
  const screeningStatus = normalizeDevelopmentalStatus(params.get('screening'));
  if (!['Mother', 'Child'].includes(beneficiaryType)
    || !['at risk', 'needs follow up'].includes(screeningStatus)) {
    return null;
  }
  return {
    beneficiaryType,
    screeningStatus: screeningStatus === 'needs follow up' ? 'Needs Follow-up' : 'At Risk',
  };
}
