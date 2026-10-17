const matchesSearch = (record, searchText) => {
  const terms = String(searchText || '').toLowerCase().split(/\s+/).filter(Boolean);
  const searchable = [record.name, record.role, record.status, record.community, record.group, record.area, record.entityType]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return terms.every((term) => searchable.includes(term));
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
    && matchesSearch(record, intent.searchText)
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
