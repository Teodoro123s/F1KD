const normalizeScopeValue = (value) => String(value || '').trim().toLowerCase();
const isDateWithinProgramSchedule = (date, startsOn, endsOn) => (
  /^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))
  && /^\d{4}-\d{2}-\d{2}$/.test(String(startsOn || ''))
  && /^\d{4}-\d{2}-\d{2}$/.test(String(endsOn || ''))
  && startsOn <= date
  && date <= endsOn
);

function isBeneficiaryInProgramScope(clusters, beneficiary, schoolId = null, groupId = null) {
  if (schoolId !== null && Number(beneficiary.community_id) !== Number(schoolId)) return false;
  if (groupId !== null && Number(beneficiary.group_id) !== Number(groupId)) return false;
  if (!clusters.length) return true;

  const clusterNames = (type) => new Set(clusters
    .filter((cluster) => normalizeScopeValue(cluster.scope_type) === type)
    .map((cluster) => normalizeScopeValue(cluster.scope_name))
    .filter(Boolean));
  const schoolNames = clusterNames('school');
  const groupNames = clusterNames('group');
  const batchNames = clusterNames('batch');
  const schoolName = normalizeScopeValue(beneficiary.community_name);
  const groupName = normalizeScopeValue(beneficiary.group_name);
  const batchName = normalizeScopeValue(beneficiary.batch_name);
  const schoolMatches = (scopeName) => scopeName === schoolName || scopeName === `${schoolName} school`;

  if (groupNames.size && groupName && !groupNames.has(groupName)) return false;
  if (groupNames.size && !groupName && !batchName) return false;
  if (batchNames.size && batchName && !batchNames.has(batchName)) return false;
  if (batchNames.size && !batchName && !groupName) return false;
  if (schoolNames.size && schoolName && ![...schoolNames].some(schoolMatches)) return false;

  return schoolNames.size + groupNames.size + batchNames.size > 0;
}

module.exports = { isBeneficiaryInProgramScope, isDateWithinProgramSchedule };
