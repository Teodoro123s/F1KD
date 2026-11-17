export const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const mapApiProgram = (program) => ({
  ...program,
  id: Number(program.id),
  beneficiaryType: program.beneficiaryType || program.beneficiary_type || 'Mother',
  target: Number(program.target || 0),
  received: Number(program.received || 0),
  clusters: program.clusters || [],
  recipients: program.recipients || [],
  latest: program.latest || 'No activity yet',
});

export const normalizeDisplayValue = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[_-]+/g, ' ')
  .replace(/\b(school|group|batch)\b/gi, '')
  .replace(/\s+/g, ' ')
  .trim();

export const collectDisplayCandidates = (...values) => (
  values.flatMap((value) => {
    if (value === null || value === undefined) return [];
    const text = String(value).trim();
    if (!text) return [];
    return text.split(/[|,/]+/).map((segment) => segment.trim()).filter(Boolean);
  })
    .map(normalizeDisplayValue)
    .filter(Boolean)
);

export const valueMatchesTarget = (value, target) => {
  const normalizedValue = normalizeDisplayValue(value);
  const normalizedTarget = normalizeDisplayValue(target);
  if (!normalizedValue || !normalizedTarget) return false;
  return normalizedValue === normalizedTarget
    || normalizedValue.includes(normalizedTarget)
    || normalizedTarget.includes(normalizedValue);
};

export const routeMatchesValue = (entity, routeValue, extraKeys = []) => {
  if (!entity || !routeValue) return false;
  const target = String(routeValue).trim().toLowerCase();
  const candidates = new Set([
    entity.id,
    entity.databaseId,
    entity.code,
    entity.batch_code,
    entity.group_code,
    entity.community_code,
    entity.name,
    entity.group_name,
    entity.batch_name,
    entity.community_name,
    ...extraKeys.map((key) => entity?.[key]),
  ].filter((value) => value !== undefined && value !== null && value !== '')
    .map((value) => String(value).trim().toLowerCase()));
  return candidates.has(target);
};

export const matchesSchoolGroupBatch = (record, schoolName, groupName, batchName) => {
  const recordSchool = String(record?.school || '').trim().toLowerCase();
  const recordGroup = String(record?.group || '').trim().toLowerCase();
  const recordBatch = String(record?.batch || '').trim().toLowerCase();
  const normalizedSchoolName = String(schoolName || '').trim().toLowerCase();
  const normalizedGroupName = String(groupName || '').trim().toLowerCase();
  const normalizedBatchName = String(batchName || '').trim().toLowerCase();

  if (normalizedSchoolName && recordSchool && recordSchool !== normalizedSchoolName) return false;
  if (normalizedBatchName && recordBatch && recordBatch !== normalizedBatchName) return false;
  if (normalizedGroupName && recordGroup && recordGroup !== normalizedGroupName) return false;
  if (normalizedGroupName && !recordGroup && normalizedBatchName && !recordBatch) return false;
  if (normalizedBatchName && !recordBatch && normalizedGroupName && !recordGroup) return false;
  return true;
};
