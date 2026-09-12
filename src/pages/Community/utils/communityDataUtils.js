/**
 * communityDataUtils.js
 * Pure functions for community data operations
 * Responsibility: Filter communities, groups, batches, mothers
 */

/**
 * Filter items by search query
 */
export const filterItemsByQuery = (items, query, fields = ['name', 'id']) => {
  if (!query.trim()) return items;
  const term = query.trim().toLowerCase();
  return items.filter((item) =>
    fields.some((field) => String(item[field] || '').toLowerCase().includes(term))
  );
};

/**
 * Build breadcrumb navigation based on active tab and selected items
 */
export const buildBreadcrumbs = ({
  activeTab,
  schoolId,
  selectedSchool,
  selectedSchoolForGroup,
  selectedSchoolForBatch,
  selectedGroup,
  selectedGroupForBatch,
}) => {
  const items = [{ label: 'Schools', to: '/community', clickable: activeTab !== 'communities' }];

  const schoolIdForGroups =
    schoolId ||
    selectedSchool?.id ||
    selectedSchoolForGroup?.id ||
    selectedSchoolForBatch?.id;

  if (activeTab === 'groups' || activeTab === 'batches' || activeTab === 'mothers') {
    items.push({
      label: 'Groups',
      to: schoolIdForGroups ? `/community/school/${schoolIdForGroups}` : '/community',
      clickable: activeTab !== 'groups',
    });
  }

  const batchGroup = selectedGroup || selectedGroupForBatch;
  if (activeTab === 'batches' || activeTab === 'mothers') {
    items.push({
      label: 'Batches',
      to: batchGroup ? `/community/group/${batchGroup.id}` : '/community',
      clickable: activeTab !== 'batches',
    });
  }

  if (activeTab === 'mothers') {
    items.push({ label: 'Mothers', clickable: false });
  }

  return items;
};

/**
 * Get groups for selected school
 */
export const getSchoolGroups = (groups, selectedSchool, query) => {
  if (!selectedSchool) return [];
  const filtered = groups.filter(
    (group) => group.community === selectedSchool.name
  );
  return filterItemsByQuery(filtered, query, [
    'name',
    'id',
    'leader',
    'status',
  ]);
};

/**
 * Get batches for selected group
 */
export const getGroupBatches = (batches, mothers, selectedGroup, query) => {
  if (!selectedGroup) return [];
  const groupBatchIds = mothers
    .filter(
      (mother) =>
        mother.group === selectedGroup.name && mother.batchId
    )
    .map((mother) => String(mother.batchId));
  const filtered = batches.filter((batch) =>
    groupBatchIds.includes(String(batch.id))
  );
  return filterItemsByQuery(filtered, query, [
    'name',
    'id',
    'community',
    'status',
  ]);
};

/**
 * Get mothers for selected batch
 */
export const getBatchMothers = (mothers, selectedBatch, query) => {
  if (!selectedBatch) return [];
  const filtered = mothers.filter(
    (mother) => mother.batchId === selectedBatch.id
  );
  return filterItemsByQuery(filtered, query, [
    'name',
    'id',
    'group',
    'status',
  ]);
};

/**
 * Get communities from list
 */
export const filterCommunities = (communities, query) => {
  return filterItemsByQuery(communities, query, ['name', 'id', 'area']);
};
