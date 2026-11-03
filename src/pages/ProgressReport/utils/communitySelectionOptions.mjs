export const batchAvailableForGroup = (batch, groupId, mothers = []) => {
  const linkedGroupIds = String(batch.groupIds || '').split(',').map((id) => id.trim()).filter(Boolean);
  if (linkedGroupIds.includes(String(groupId))) return true;
  return mothers.some((mother) => (
    String(mother.groupId) === String(groupId)
    && String(mother.batchId) === String(batch.id)
  ));
};

export const filterReportGroups = (groups, schoolId) => groups.filter((group) => (
  !schoolId || String(group.schoolId) === String(schoolId)
));

export const filterReportBatches = (batches, schoolId, groupId, mothers) => batches.filter((batch) => {
  if (schoolId && String(batch.schoolId) !== String(schoolId)) return false;
  return !groupId || batchAvailableForGroup(batch, groupId, mothers);
});

export const reportBatchOptionLabels = (batches, groups) => {
  const groupNamesById = new Map(groups.map((group) => [String(group.id), group.name]));
  const nameCounts = new Map();
  batches.forEach((batch) => {
    const name = String(batch.name || batch.code || `Batch ${batch.id}`).trim();
    const key = name.toLocaleLowerCase();
    nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
  });

  const options = batches.map((batch) => {
    const name = String(batch.name || batch.code || `Batch ${batch.id}`).trim();
    if (nameCounts.get(name.toLocaleLowerCase()) === 1) return { id: batch.id, label: name };

    const groupNames = [...new Set(
      String(batch.groupIds || '')
        .split(',')
        .map((id) => groupNamesById.get(id.trim()))
        .filter(Boolean),
    )];
    return {
      id: batch.id,
      label: groupNames.length ? `${name} — ${groupNames.join(', ')}` : name,
      code: batch.code,
    };
  });

  const labelCounts = new Map();
  options.forEach(({ label }) => {
    labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
  });
  options.forEach((option, index) => {
    if (labelCounts.get(option.label) > 1) {
      options[index] = {
        ...option,
        label: option.code ? `${option.label} (${option.code})` : `${option.label} (ID ${option.id})`,
      };
    }
  });

  const finalLabelCounts = new Map();
  options.forEach(({ label }) => {
    finalLabelCounts.set(label, (finalLabelCounts.get(label) || 0) + 1);
  });
  return options.map((option) => (
    finalLabelCounts.get(option.label) > 1
      ? { ...option, label: `${option.label} (ID ${option.id})` }
      : option
  ));
};
