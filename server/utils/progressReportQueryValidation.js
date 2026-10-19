const { parsePositiveIntegerId } = require('./userInputValidation');

const OPTIONAL_ID_FIELDS = ['schoolId', 'groupId', 'batchId', 'motherId'];

function validateProgressReportQuery(query = {}) {
  for (const field of OPTIONAL_ID_FIELDS) {
    const value = query[field];
    if (value === undefined || value === null || value === '' || String(value).trim().toLowerCase() === 'all') {
      continue;
    }
    if (parsePositiveIntegerId(value) === null) {
      return `${field} must be a positive integer or all`;
    }
  }

  for (const field of ['page', 'perPage']) {
    if (query[field] !== undefined && parsePositiveIntegerId(query[field]) === null) {
      return `${field} must be a positive integer`;
    }
  }

  const page = query.page === undefined ? 1 : parsePositiveIntegerId(query.page);
  const perPage = Math.min(100, query.perPage === undefined ? 50 : parsePositiveIntegerId(query.perPage));
  if (!Number.isSafeInteger((page - 1) * perPage)) return 'page is too large';

  const benefitPeriod = String(query.benefitPeriod || 'overall').trim().toLowerCase();
  if (!['overall', 'month'].includes(benefitPeriod)) {
    return 'benefitPeriod must be overall or month';
  }

  const granularity = String(query.granularity || 'child').trim().toLowerCase();
  if (!['mother', 'child'].includes(granularity)) {
    return 'granularity must be mother or child';
  }

  const benefitMonth = query.benefitMonth === undefined ? '' : String(query.benefitMonth);
  if (benefitMonth && !/^(?:1\d{3}|[2-9]\d{3})-(?:0[1-9]|1[0-2])$/.test(benefitMonth)) {
    return 'benefitMonth must be a valid month in YYYY-MM format';
  }

  const exportValue = String(query.export || '').trim().toLowerCase();
  if (!['', '0', '1'].includes(exportValue)) {
    return 'export must be 0 or 1';
  }

  if (query.search !== undefined && typeof query.search !== 'string') {
    return 'search must be text';
  }
  if (String(query.search || '').length > 200) {
    return 'search must be 200 characters or fewer';
  }

  return null;
}

module.exports = { validateProgressReportQuery };
