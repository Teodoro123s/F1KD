function parseListPagination(query = {}) {
  const parse = (value, fallback) => {
    if (value === undefined) return fallback;
    const raw = String(value);
    if (!/^[1-9]\d*$/.test(raw)) return null;
    const parsed = Number(raw);
    return Number.isSafeInteger(parsed) ? parsed : null;
  };

  const page = parse(query.page, 1);
  const perPage = parse(query.perPage, 100);
  if (page === null) return { error: 'page must be a positive integer' };
  if (perPage === null || perPage > 100) {
    return { error: 'perPage must be a positive integer no greater than 100' };
  }

  const offset = (page - 1) * perPage;
  if (!Number.isSafeInteger(offset)) return { error: 'page is out of range' };
  return { page, perPage, offset };
}

function parseOptionalPositiveInteger(value, fieldName) {
  if (value === undefined || value === '') return { value: null };
  const raw = String(value);
  if (!/^[1-9]\d*$/.test(raw)) {
    return { error: `${fieldName} must be a positive integer` };
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) {
    return { error: `${fieldName} must be a positive integer` };
  }
  return { value: parsed };
}

function parseListSearch(value) {
  if (value === undefined || value === '') return { value: '' };
  if (Array.isArray(value) || typeof value !== 'string' || value.length > 120) {
    return { error: 'search must be a string no longer than 120 characters' };
  }
  return { value: value.trim() };
}

module.exports = {
  parseListPagination,
  parseOptionalPositiveInteger,
  parseListSearch,
};
