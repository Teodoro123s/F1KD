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
