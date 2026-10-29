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
