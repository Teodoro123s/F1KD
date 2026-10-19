/**
 * beneficiaryUtils.js
 * Pure functions for beneficiary operations
 * Responsibility: Filter, search, merge beneficiary data
 */

/**
 * Filter mothers by search query
 */
export const filterMothersByQuery = (mothers, query, fields = ['name', 'id', 'group', 'status']) => {
  if (!query.trim()) return mothers;
  const term = query.trim().toLowerCase();
  return mothers.filter((mother) =>
    fields.some((field) => String(mother[field] || '').toLowerCase().includes(term))
  );
};

/**
 * Filter children by search query
 */
export const filterChildrenByQuery = (children, query, fields = ['name', 'id', 'group', 'status']) => {
  if (!query.trim()) return children;
  const term = query.trim().toLowerCase();
  return children.filter((child) =>
    fields.some((field) => String(child[field] || '').toLowerCase().includes(term))
  );
};

export const matchesBeneficiarySearch = (record, query) => {
  const original = record.original || record.raw || record;
  const mother = original.mother || {};
  const searchableText = [
    record.name,
    record.community,
    record.id,
    original.firstName,
    original.first_name,
    original.middleName,
    original.middle_name,
    original.lastName,
    original.last_name,
    original.childName,
    original.motherName,
    original.mother_name,
    original.mother_code,
    mother.name,
    mother.firstName,
    mother.first_name,
    mother.middleName,
    mother.middle_name,
    mother.lastName,
    mother.last_name,
    original.group,
    original.group_name,
    original.groupName,
    original.batch,
    original.batch_name,
    original.batchName,
    original.batchCode,
    original.batch_code,
  ]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .join(' ')
    .toLowerCase();

  return String(query || '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => searchableText.includes(term));
};

/**
 * Merge mother data with fetched details and children
 */
export const mergeMotherDetailsWithChildren = (baseMother, detailMother, children) => {
  return {
    ...baseMother,
    ...(detailMother || {}),
    children: children || [],
  };
};

/**
 * Get children for a mother
 */
export const getMotherChildren = (allChildren, motherId) => {
  return allChildren.filter((child) => String(child.motherId) === String(motherId));
};

export const getBatchesForGroup = (batches, groupId, community) => {
  if (!groupId) return [];

  return batches.filter((batch) => {
    if (community && batch.community && batch.community !== community) return false;

    const assignedGroupIds = String(batch.groupIds || batch.group_id || batch.groupId || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    return assignedGroupIds.length === 0 || assignedGroupIds.includes(String(groupId));
  });
};
