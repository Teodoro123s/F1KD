function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSearchTokens(query) {
  return [...new Set(normalizeSearchText(query).split(' ').filter((token) => token.length >= 2))];
}

function escapeLikeToken(token) {
  return token.replace(/[=%_]/g, (character) => `=${character}`);
}

function buildTokenSearchCondition(fields, query) {
  if (!String(query ?? '').trim() || !fields.length) return { sql: '', params: [] };
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return { sql: '1 = 0', params: [] };
  const tokens = getSearchTokens(query);
  if (!tokens.length) {
    return {
      sql: `(${fields.map((field) => `LOWER(COALESCE(${field}, '')) = ?`).join(' OR ')})`,
      params: fields.map(() => normalizedQuery),
    };
  }

  const sql = tokens
    .map(() => `(${fields.map((field) => `LOWER(COALESCE(${field}, '')) LIKE ? ESCAPE '='`).join(' OR ')})`)
    .join(' AND ');
  const params = tokens.flatMap((token) => fields.map(() => `%${escapeLikeToken(token)}%`));
  return { sql, params };
}

module.exports = {
  buildTokenSearchCondition,
  getSearchTokens,
  normalizeSearchText,
};
