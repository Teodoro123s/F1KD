/**
 * filterUtils.js - Pure filter parsing and application logic
 * 
 * RESPONSIBILITY: Parse filter context (school/group/batch), search queries, and apply filters to rows.
 * This module contains pure functions with no side effects or React dependencies.
 * 
 * ARCHITECTURE LAYER: Service/Business Logic Layer
 * - No React dependencies ✓
 * - No API calls ✓
 * - Fully unit-testable ✓
 * 
 * USAGE:
 *   const context = parseContext('School A', 'Group B', 'All Batches');
 *   const parsed = parseQuery(search, SEARCH_FILTER_RULES);
 *   const filtered = filterRows(rows, context, parsed, SEARCH_FILTER_RULES, hasValue);
 * 
 * EXPORTS:
 *   - parseContext(school, group, batch)
 *   - parseQuery(search, searchFilterRules)
 *   - filterRows(rows, context, parsedQuery, searchFilterRules, hasValueFn)
 *   - extractOptions(rows, field)
 */

/**
 * Parse dropdown context (school, group, batch) into a structured filter object
 * 
 * @param {string} school - Selected school name (or 'All Schools')
 * @param {string} group - Selected group name (or 'All Groups')  
 * @param {string} batch - Selected batch name (or 'All Batches')
 * @returns {Object} Filter context with boolean flags for 'All' states
 * 
 * @example
 * const context = parseContext('Mountain School', 'Health Group', 'All Batches');
 * // Returns:\n * // {\n * //   school: 'Mountain School',\n * //   group: 'Health Group',\n * //   batch: 'All Batches',\n * //   isAllSchools: false,\n * //   isAllGroups: false,\n * //   isAllBatches: true\n * // }\n */
export const parseContext = (school, group, batch) => ({
  school,
  group,
  batch,
  isAllSchools: school === 'All Schools',
  isAllGroups: group === 'All Groups',
  isAllBatches: batch === 'All Batches',
});

/**
 * Parse search query into filter tokens and structured filters
 */
export const parseQuery = (search, searchFilterRules) => {
  const filters = searchFilterRules.flatMap((rule) => {
    const match = search.match(rule.pattern);
    if (!match) return [];
    return [
      {
        id: `search-${rule.id}`,
        label: rule.getLabel ? rule.getLabel(match) : rule.label,
        pattern: rule.pattern,
        ruleId: rule.id,
      },
    ];
  });

  const remainingQuery = searchFilterRules
    .reduce((value, rule) => value.replace(rule.pattern, ''), search)
    .replace(/\s{2,}/g, ' ')
    .trim();

  return { filters, remainingQuery };
};

/**
 * Apply filter criteria to rows
 */
export const filterRows = (rows, context, parsedQuery, searchFilterRules, hasValueFn) => {
  const { school, group, batch } = context;
  const { filters: searchFilters, remainingQuery } = parsedQuery;
  const query = remainingQuery.toLowerCase();

  return rows.filter((row) => {
    const textMatch =
      !query ||
      [row.name, row.id, row.trimester, row.school, row.community, row.group, row.batch]
        .join(' ')
        .toLowerCase()
        .includes(query);

    const scopeMatch =
      (school === 'All Schools' || row.school === school || row.community === school) &&
      (group === 'All Groups' || row.group === group) &&
      (batch === 'All Batches' || row.batch === batch);

    const parsedMatch = searchFilters.every((filter) => {
      if (filter.ruleId === 'risk') return Boolean(row.risk);
      if (filter.ruleId === 'trimester') {
        const expected = String(filter.label || '').split(': ')[1] || '';
        return String(row.trimester || '').toLowerCase().includes(expected.toLowerCase());
      }
      if (filter.ruleId === 'progress') {
        const progressRange = String(filter.label || '').replace(/^Progress:\s*/i, '').replace(/%/g, '').trim();
        const normalized = Number(row.progress ?? 0);
        if (!progressRange) return true;
        if (progressRange.includes('0-25')) return normalized >= 0 && normalized <= 25;
        if (progressRange.includes('26-50')) return normalized >= 26 && normalized <= 50;
        if (progressRange.includes('51-75')) return normalized >= 51 && normalized <= 75;
        if (progressRange.includes('76-100')) return normalized >= 76 && normalized <= 100;
        return true;
      }
      if (filter.ruleId === 'bmi') {
        const expected = String(filter.label || '').split(': ')[1] || '';
        return String(row.bmi ?? '').toLowerCase().includes(expected.toLowerCase());
      }
      if (filter.ruleId === 'birth-cert') return !row.birthCert;
      if (filter.ruleId === 'consent') return !row.consent;
      if (filter.ruleId === 'vaccine') return Array.isArray(row.tt) ? row.tt.some((date) => !hasValueFn(date)) : false;
      if (filter.ruleId === 'dental') return Boolean(row.dental);
      if (filter.ruleId === 'gpa') return Number(row.source?.gravida ?? 0) === 1;
      return true;
    });

    return textMatch && scopeMatch && parsedMatch;
  });
};

/**
 * Count active filters for UI display
 */
export const countActiveFilters = (context, searchFilters, beneficiaryType) => {
  return [
    context.school !== 'All Schools',
    context.group !== 'All Groups',
    context.batch !== 'All Batches',
    ...searchFilters.map(() => true),
    beneficiaryType !== 'Mothers',
  ].filter(Boolean).length;
};

/**
 * Extract unique dropdown options from rows
 */
export const extractOptions = (rows, context) => {
  const schoolOptions = ['All Schools', ...new Set(rows.map((row) => row.school || row.community).filter(Boolean))];

  const schoolRows =
    context.school === 'All Schools'
      ? rows
      : rows.filter((row) => (row.school || row.community) === context.school);
  const groupOptions = ['All Groups', ...new Set(schoolRows.map((row) => row.group).filter(Boolean))];

  const groupRows =
    context.group === 'All Groups' ? schoolRows : schoolRows.filter((row) => row.group === context.group);
  const batchOptions = ['All Batches', ...new Set(groupRows.map((row) => row.batch).filter(Boolean))];

  return { schoolOptions, groupOptions, batchOptions };
};

/**
 * Validate that current dropdown values still exist in available options
 */
export const validateAndNormalizeContext = (context, options) => {
  return {
    school: options.schoolOptions.includes(context.school) ? context.school : 'All Schools',
    group: options.groupOptions.includes(context.group) ? context.group : 'All Groups',
    batch: options.batchOptions.includes(context.batch) ? context.batch : 'All Batches',
  };
};

/**
 * Check if rows match a batch comparison query (e.g., "initial bmi group ABC batches X and Y")
 */
export const parseComparisonRequest = (search, beneficiaryType) => {
  if (beneficiaryType !== 'Mothers' || !/\binitial\b[\s\w-]*\bbmi\b/i.test(search)) {
    return null;
  }

  const groupMatch = search.match(/\bgroup\s+([a-z0-9-]+)/i);
  const batchMatch = search.match(/\bbatches?\s+([a-z0-9-]+)\s*(?:and|&)\s*([a-z0-9-]+)/i);

  if (!groupMatch || !batchMatch) return null;

  return {
    group: groupMatch[1],
    batches: [batchMatch[1], batchMatch[2]],
  };
};
