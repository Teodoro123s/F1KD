/**
 * useProgressFilters.js - Filter State Orchestration Hook
 * 
 * RESPONSIBILITY: Manage all filter-related state (school/group/batch/search/showAllFilters)
 * and compute derived values (filteredRows, filterOptions, activeCount, comparisonRequest).
 * 
 * ARCHITECTURE LAYER: State Orchestration Layer (React Custom Hook)
 * - Composes filterUtils pure functions
 * - Manages filter UI state only
 * - No component rendering (JSX) ✓
 * - Fully composable with other hooks ✓
 * 
 * REPLACES IN ORIGINAL COMPONENT:
 *   - 5 state declarations (school, group, batch, search, showAllFilters)
 *   - 4+ useMemo computations
 *   - 3+ useEffect calls
 *   TOTAL: ~70 lines → 1 custom hook
 * 
 * IMPORTS:
 *   - filterUtils: Pure functions for parsing and filtering
 *   - progressReportUtils: Constants and helpers
 * 
 * EXPORTS:
 *   - useProgressFilters(props) → Hook for React components
 */

import { useMemo, useState, useEffect } from 'react';
import {
  parseContext,
  parseQuery,
  filterRows,
  countActiveFilters,
  extractOptions,
  validateAndNormalizeContext,
  parseComparisonRequest,
} from '../utils/filterUtils';

/**
 * Custom React hook for orchestrating filter state and derived values
 * 
 * Manages dropdown filters (school/group/batch), search queries, and computed results.
 * Uses pure utility functions internally for filtering logic.
 * 
 * @param {Object} props - Configuration object
 * @param {Array} props.allRows - All beneficiary rows to filter
 * @param {Array} props.searchFilterRules - Filter rules for search parsing
 * @param {Function} props.hasValueFn - Function to check if field has value
 * 
 * @returns {Object} Filter state and computed values
 *   - school, setSchool, group, setGroup, batch, setBatch: Dropdown state
 *   - search, setSearch: Search query state\n *   - showAllFilters, setShowAllFilters: UI state for compact/expanded view\n *   - searchFilters: Parsed filter tokens from search query\n *   - filteredRows: Rows matching all active filters\n *   - activeFilterCount: Number of active filters\n *   - comparisonRequest: Structured batch comparison request (if pattern matches)\n *   - schoolOptions, groupOptions, batchOptions: Computed dropdown options\n * \n * USAGE:\n *   const { school, setSchool, filteredRows, schoolOptions } = useProgressFilters({\n *     allRows: mothers,\n *     searchFilterRules: SEARCH_FILTER_RULES,\n *     hasValueFn: hasValue\n *   });\n * \n * PERFORMANCE:\n *   - useMemo: Filters, options, and comparisons are memoized\n *   - Recomputes only when dependencies change\n *   - Non-blocking: All computations in JavaScript (no API calls)\n */
export const useProgressFilters = ({
  allRows,
  searchFilterRules,
  hasValueFn,
  beneficiaryType,
}) => {
  // Core filter state
  const [school, setSchool] = useState('All Schools');
  const [group, setGroup] = useState('All Groups');
  const [batch, setBatch] = useState('All Batches');
  const [search, setSearch] = useState('');
  const [showAllFilters, setShowAllFilters] = useState(false);

  // Parse context and query
  const context = useMemo(() => parseContext(school, group, batch), [school, group, batch]);

  const { filters: searchFilters, remainingQuery } = useMemo(
    () => parseQuery(search, searchFilterRules),
    [search, searchFilterRules]
  );

  // Compute dropdown options
  const options = useMemo(() => extractOptions(allRows, context), [allRows, context]);

  // Validate and normalize context values
  useEffect(() => {
    const validated = validateAndNormalizeContext(context, options);
    if (validated.school !== school) setSchool(validated.school);
    if (validated.group !== group) setGroup(validated.group);
    if (validated.batch !== batch) setBatch(validated.batch);
  }, [context.school, context.group, context.batch, options.schoolOptions, options.groupOptions, options.batchOptions, school, group, batch]);

  // Apply filters to rows
  const filteredRows = useMemo(
    () =>
      filterRows(allRows, context, { filters: searchFilters, remainingQuery }, searchFilterRules, hasValueFn),
    [allRows, context, searchFilters, remainingQuery, searchFilterRules, hasValueFn]
  );

  // Count active filters
  const activeFilterCount = useMemo(
    () => countActiveFilters(context, searchFilters, beneficiaryType),
    [context, searchFilters, beneficiaryType]
  );

  // Parse comparison request if applicable
  const comparisonRequest = useMemo(
    () => parseComparisonRequest(search, beneficiaryType),
    [search, beneficiaryType]
  );

  // Reset state when beneficiary type changes
  useEffect(() => {
    setSchool('All Schools');
    setGroup('All Groups');
    setBatch('All Batches');
    setSearch('');
  }, [beneficiaryType]);

  return {
    // State
    school,
    setSchool,
    group,
    setGroup,
    batch,
    setBatch,
    search,
    setSearch,
    showAllFilters,
    setShowAllFilters,
    // Computed
    searchFilters,
    filteredRows,
    activeFilterCount,
    comparisonRequest,
    // Options
    schoolOptions: options.schoolOptions,
    groupOptions: options.groupOptions,
    batchOptions: options.batchOptions,
  };
};
