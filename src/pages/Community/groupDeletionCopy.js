export function getGroupDeletionDescription(group, impact) {
  const groupName = impact?.name || group?.name || 'this group';
  const schoolName = impact?.community || group?.community || 'its School';
  const motherCount = impact?.mothers;
  const childCount = impact?.children;
  const workerCount = impact?.healthWorkers;

  return [
    `Delete the group "${groupName}"?`,
    `Its batches will remain under ${schoolName}, but will be unassigned from this group. Mothers and children assigned to the group or its batches will remain in the system and be unassigned from those assignments. Health workers assigned to the group will also be unassigned.`,
    motherCount === undefined || childCount === undefined || workerCount === undefined
      ? 'No beneficiary or health records will be deleted.'
      : `This affects ${impact?.batches ?? 0} batches, ${motherCount} mothers, ${childCount} children, and ${workerCount} health workers. No beneficiary or health records will be deleted.`,
  ].join('\n\n');
}

export function getGroupDeletionSummary(impact, isLoading = false) {
  const valueFor = (key) => (isLoading ? 'Loading…' : impact ? impact[key] : 'Unavailable');
  return [
    { label: 'Batches', value: valueFor('batches') },
    { label: 'Mothers', value: valueFor('mothers') },
    { label: 'Children', value: valueFor('children') },
    { label: 'Health workers', value: valueFor('healthWorkers') },
  ];
}
