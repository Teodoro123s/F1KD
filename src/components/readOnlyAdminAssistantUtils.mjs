const matchesSearch = (record, searchText) => {
  const terms = String(searchText || '').toLowerCase().split(/\s+/).filter(Boolean);
  const searchable = [record.name, record.role, record.status, record.community, record.group, record.area, record.entityType]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return terms.every((term) => searchable.includes(term));
};

const normalizeName = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const editDistance = (left, right) => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
};

const isSimilarBatchName = (record, searchText) => {
  if (record.entityType !== 'Batch') return false;
  const query = normalizeName(searchText);
  const name = normalizeName(record.name);
  if (!query || !name) return false;
  const maxLength = Math.max(query.length, name.length);
  const allowedDistance = maxLength <= 5 ? 1 : Math.min(3, Math.floor(maxLength * 0.2));
  return editDistance(query, name) <= allowedDistance;
};

const groupLabel = (record, groupBy) => {
  if (groupBy === 'role') return record.role || 'Unspecified role';
  if (groupBy === 'status') return record.status || 'Unspecified status';
  if (groupBy === 'community') return record.community || 'Unassigned';
  if (groupBy === 'entityType') return record.entityType || 'Other';
  return 'All matching records';
};

export const filterAdminAssistantRecords = (records, intent) => {
  if (!intent || intent.mode === 'setup') return [];
  return records.filter((record) => (
    (intent.role === 'All' || record.role === intent.role)
    && (intent.status === 'All' || String(record.status || '').toLowerCase() === intent.status.toLowerCase())
    && (intent.entityType === 'All' || record.entityType === intent.entityType)
    && (
      matchesSearch(record, intent.searchText)
      || (intent.similarMatch && intent.entityType === 'Batch' && isSimilarBatchName(record, intent.searchText))
    )
  ));
};

export const summarizeAdminAssistantRecords = (records, groupBy) => {
  const groups = new Map();
  records.forEach((record) => {
    const label = groupLabel(record, groupBy);
    groups.set(label, (groups.get(label) || 0) + 1);
  });
  return [...groups.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
};
