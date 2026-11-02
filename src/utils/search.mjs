export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getSearchTokens(query) {
  return [...new Set(normalizeSearchText(query).split(' ').filter((token) => token.length >= 2))];
}

export function matchesSearch(query, values) {
  const normalizedQuery = normalizeSearchText(query);
  if (!String(query ?? '').trim()) return true;
  if (!normalizedQuery) return false;

  const searchableValues = (Array.isArray(values) ? values : [values])
    .flat(Infinity)
    .filter((value) => value !== null && value !== undefined)
    .map(normalizeSearchText)
    .filter(Boolean);

  const tokens = getSearchTokens(query);
  if (!tokens.length) {
    return normalizedQuery.length === 1
      && searchableValues.some((value) => value === normalizedQuery);
  }

  return tokens.every((token) => searchableValues.some((value) => value.includes(token)));
}
