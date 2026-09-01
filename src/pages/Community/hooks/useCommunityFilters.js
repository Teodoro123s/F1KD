/**
 * useCommunityFilters.js
 * Custom hook for managing community page filters and navigation
 * Responsibility: Manage tab state, query, pagination, selected items, breadcrumbs
 */

import { useMemo, useState } from 'react';
import {
  buildBreadcrumbs,
  filterCommunities,
  filterItemsByQuery,
  getBatchMothers,
  getGroupBatches,
  getSchoolGroups,
} from '../utils/communityDataUtils';

export const useCommunityFilters = ({
  communities,
  groups,
  batches,
  mothers,
  selectedSchool,
  selectedGroup,
  selectedBatch,
  selectedSchoolForGroup,
  selectedSchoolForBatch,
  selectedGroupForBatch,
  schoolId,
}) => {
  const [activeTab, setActiveTab] = useState('communities');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Build breadcrumbs
  const breadcrumbItems = useMemo(
    () =>
      buildBreadcrumbs({
        activeTab,
        schoolId,
        selectedSchool,
        selectedSchoolForGroup,
        selectedSchoolForBatch,
        selectedGroup,
        selectedGroupForBatch,
      }),
    [
      activeTab,
      schoolId,
      selectedSchool,
      selectedSchoolForGroup,
      selectedSchoolForBatch,
      selectedGroup,
      selectedGroupForBatch,
    ]
  );

  // Get filtered groups for selected school
  const selectedSchoolGroups = useMemo(
    () => getSchoolGroups(groups, selectedSchool, query),
    [groups, selectedSchool, query]
  );

  // Get filtered batches for selected group
  const selectedGroupBatches = useMemo(
    () => getGroupBatches(batches, mothers, selectedGroup, query),
    [batches, mothers, selectedGroup, query]
  );

  // Get filtered mothers for selected batch
  const selectedBatchMothers = useMemo(
    () => getBatchMothers(mothers, selectedBatch, query),
    [mothers, selectedBatch, query]
  );

  // Main filtered data based on active tab
  const filteredData = useMemo(() => {
    if (activeTab === 'communities') {
      return filterCommunities(communities, query);
    }
    if (activeTab === 'groups') {
      return filterItemsByQuery(groups, query, ['name', 'id', 'leader', 'status']);
    }
    if (activeTab === 'batches') {
      return filterItemsByQuery(batches, query, [
        'name',
        'id',
        'community',
        'status',
      ]);
    }
    if (activeTab === 'mothers') {
      return selectedBatchMothers;
    }
    return [];
  }, [activeTab, communities, groups, batches, query, selectedBatchMothers]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return filteredData.slice(start, end);
  }, [filteredData, page, perPage]);

  const pageCount = Math.ceil(filteredData.length / perPage);
  const rangeStart = (page - 1) * perPage + 1;
  const rangeEnd = Math.min(page * perPage, filteredData.length);

  return {
    activeTab,
    setActiveTab,
    query,
    setQuery,
    page,
    setPage,
    perPage,
    setPerPage,
    breadcrumbItems,
    selectedSchoolGroups,
    selectedGroupBatches,
    selectedBatchMothers,
    filteredData,
    paginatedData,
    pageCount,
    rangeStart,
    rangeEnd,
  };
};
