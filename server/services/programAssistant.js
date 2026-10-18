const { getProgramVisibilityFilter } = require('../utils/programAccess');

const toNumber = (value) => Number(value || 0);
const getYear = (value) => {
  const match = String(value || '').match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
};

function buildProgramAssistantAnswer(intent, programs, aggregates) {
  const yearDescription = intent.year
    ? ` in ${intent.year}${intent.yearBasis === 'created' ? ' (creation year)' : intent.yearBasis === 'checkin' ? ' (check-in year)' : ''}`
    : '';
  if (intent.task === 'list') {
    return `Found ${aggregates.programCount} matching program${aggregates.programCount === 1 ? '' : 's'}${yearDescription}.`;
  }
  if (intent.metric === 'checkins') {
    return `${aggregates.checkIns} recorded check-ins across ${aggregates.programCount} matching program${aggregates.programCount === 1 ? '' : 's'}${yearDescription}, from ${aggregates.checkedInBeneficiaries} distinct beneficiary record${aggregates.checkedInBeneficiaries === 1 ? '' : 's'}.`;
  }
  if (intent.metric === 'eligible_beneficiaries') {
    return `${aggregates.eligibleBeneficiaries} distinct eligible beneficiaries across ${aggregates.programCount} matching program${aggregates.programCount === 1 ? '' : 's'}${yearDescription}. A beneficiary is counted once per program.`;
  }
  if (intent.metric === 'programs') {
    return `${aggregates.programCount} matching program${aggregates.programCount === 1 ? '' : 's'}${yearDescription}.`;
  }
  return `${aggregates.programCount} matching program${aggregates.programCount === 1 ? '' : 's'}, ${aggregates.eligibleBeneficiaries} distinct eligible beneficiaries, and ${aggregates.checkIns} recorded check-ins${yearDescription}. Eligible beneficiaries are counted once per program.`;
}

async function createProgramAssistantResult({ req, intent, currentProgramId, pool }) {
  if (req.isHealthWorker && !req.groupId) {
    const error = new Error('Health workers must be assigned to a group to use the Program assistant.');
    error.status = 403;
    throw error;
  }
  const visibility = getProgramVisibilityFilter(req);
  const [visiblePrograms] = await pool.query(
    `SELECT p.id, p.name, p.type, p.provider, p.description, p.beneficiary_type, p.status, p.created_at
     FROM programs p ${visibility.sql}
     ORDER BY p.id DESC`,
    visibility.values,
  );

  let candidatePrograms = visiblePrograms;
  if (intent.useCurrentProgram) {
    const requestedId = Number(currentProgramId);
    if (!Number.isSafeInteger(requestedId) || requestedId < 1) {
      const error = new Error('Open a program before asking about the current program.');
      error.status = 400;
      throw error;
    }
    candidatePrograms = candidatePrograms.filter((program) => Number(program.id) === requestedId);
    if (!candidatePrograms.length) {
      const error = new Error('This program is not available to your account.');
      error.status = 403;
      throw error;
    }
  }

  if (intent.status !== 'All') {
    candidatePrograms = candidatePrograms.filter((program) => (
      String(program.status || '').toLowerCase() === intent.status.toLowerCase()
    ));
  }
  if (intent.year && intent.yearBasis === 'created') {
    candidatePrograms = candidatePrograms.filter((program) => getYear(program.created_at) === intent.year);
  }

  const candidateIds = candidatePrograms.map((program) => Number(program.id)).filter((id) => Number.isSafeInteger(id) && id > 0);
  if (!candidateIds.length) {
    const aggregates = { programCount: 0, eligibleBeneficiaries: 0, checkIns: 0, checkedInBeneficiaries: 0 };
    return { answer: buildProgramAssistantAnswer(intent, [], aggregates), intent, aggregates, programs: [] };
  }

  const placeholders = candidateIds.map(() => '?').join(', ');
  const [clusters] = await pool.query(
    `SELECT program_id, scope_type, scope_name
     FROM program_clusters WHERE program_id IN (${placeholders})`,
    candidateIds,
  );
  const clustersByProgramId = new Map();
  clusters.forEach((cluster) => {
    const key = Number(cluster.program_id);
    const current = clustersByProgramId.get(key) || [];
    current.push(String(cluster.scope_name || ''));
    clustersByProgramId.set(key, current);
  });

  const searchWords = intent.searchText.toLowerCase().split(/\s+/).filter(Boolean);
  candidatePrograms = candidatePrograms.filter((program) => {
    const searchable = [
      program.name,
      program.type,
      program.provider,
      program.description,
      program.beneficiary_type,
      ...(clustersByProgramId.get(Number(program.id)) || []),
    ].filter(Boolean).join(' ').toLowerCase();
    return searchWords.every((word) => searchable.includes(word));
  });

  const matchingIds = candidatePrograms.map((program) => Number(program.id));
  if (!matchingIds.length) {
    const aggregates = { programCount: 0, eligibleBeneficiaries: 0, checkIns: 0, checkedInBeneficiaries: 0 };
    return { answer: buildProgramAssistantAnswer(intent, [], aggregates), intent, aggregates, programs: [] };
  }
  const matchingPlaceholders = matchingIds.map(() => '?').join(', ');
  const motherScopeClause = req.isHealthWorker ? 'AND m.group_id = ?' : req.isCommunityOrganizer ? 'AND m.community_id = ?' : '';
  const childScopeClause = req.isHealthWorker
    ? 'AND COALESCE(c.group_id, parent_m.group_id) = ?'
    : req.isCommunityOrganizer
      ? 'AND COALESCE(c.community_id, parent_m.community_id) = ?'
      : '';
  const beneficiaryScopeValues = req.isHealthWorker
    ? [req.groupId, req.groupId]
    : req.isCommunityOrganizer
      ? [req.schoolId, req.schoolId]
      : [];
  const [eligibleRows] = await pool.query(
    `SELECT eligible.program_id, COUNT(DISTINCT CONCAT(eligible.beneficiary_type, ':', eligible.beneficiary_id)) AS eligible_beneficiaries
     FROM (
       SELECT pc.program_id, 'mother' AS beneficiary_type, m.id AS beneficiary_id
       FROM program_clusters pc
       INNER JOIN programs p ON p.id = pc.program_id
       INNER JOIN mothers m ON 1 = 1
       LEFT JOIN communities co ON co.id = m.community_id
       LEFT JOIN \`groups\` g ON g.id = m.group_id
       LEFT JOIN batches b ON b.id = m.batch_id
       WHERE pc.program_id IN (${matchingPlaceholders})
         AND LOWER(TRIM(p.beneficiary_type)) IN ('mother', 'mother and child', 'mother & child')
         ${motherScopeClause}
         AND (
           (pc.scope_type = 'School' AND (
             LOWER(TRIM(pc.scope_name)) = LOWER(TRIM(COALESCE(co.name, '')))
             OR LOWER(TRIM(pc.scope_name)) = LOWER(TRIM(CONCAT(COALESCE(co.name, ''), ' School')))
           ))
           OR (pc.scope_type = 'Group' AND LOWER(TRIM(pc.scope_name)) = LOWER(TRIM(COALESCE(g.name, ''))))
           OR (pc.scope_type = 'Batch' AND LOWER(TRIM(pc.scope_name)) = LOWER(TRIM(COALESCE(b.name, ''))))
         )

       UNION ALL

       SELECT pc.program_id, 'child' AS beneficiary_type, c.id AS beneficiary_id
       FROM program_clusters pc
       INNER JOIN programs p ON p.id = pc.program_id
       INNER JOIN children c ON 1 = 1
       LEFT JOIN mothers parent_m ON parent_m.id = c.mother_id
       LEFT JOIN communities co ON co.id = COALESCE(c.community_id, parent_m.community_id)
       LEFT JOIN \`groups\` g ON g.id = COALESCE(c.group_id, parent_m.group_id)
       LEFT JOIN batches b ON b.id = COALESCE(c.batch_id, parent_m.batch_id)
       WHERE pc.program_id IN (${matchingPlaceholders})
         AND LOWER(TRIM(p.beneficiary_type)) IN ('child', 'mother and child', 'mother & child')
         ${childScopeClause}
         AND (
           (pc.scope_type = 'School' AND (
             LOWER(TRIM(pc.scope_name)) = LOWER(TRIM(COALESCE(co.name, '')))
             OR LOWER(TRIM(pc.scope_name)) = LOWER(TRIM(CONCAT(COALESCE(co.name, ''), ' School')))
           ))
           OR (pc.scope_type = 'Group' AND LOWER(TRIM(pc.scope_name)) = LOWER(TRIM(COALESCE(g.name, ''))))
           OR (pc.scope_type = 'Batch' AND LOWER(TRIM(pc.scope_name)) = LOWER(TRIM(COALESCE(b.name, ''))))
         )
     ) eligible
     GROUP BY eligible.program_id`,
    [...matchingIds, ...beneficiaryScopeValues.slice(0, 1), ...matchingIds, ...beneficiaryScopeValues.slice(1)],
  );

  const checkInYearClause = intent.year && intent.yearBasis === 'checkin' ? 'AND YEAR(monitored_date) = ?' : '';
  const checkInScopeClause = req.isHealthWorker
    ? `AND (
      (LOWER(TRIM(ml.beneficiary_type)) = 'mother' AND m.group_id = ?)
      OR (LOWER(TRIM(ml.beneficiary_type)) = 'child' AND COALESCE(c.group_id, parent_m.group_id) = ?)
    )`
    : req.isCommunityOrganizer
      ? `AND (
        (LOWER(TRIM(ml.beneficiary_type)) = 'mother' AND m.community_id = ?)
        OR (LOWER(TRIM(ml.beneficiary_type)) = 'child' AND COALESCE(c.community_id, parent_m.community_id) = ?)
      )`
      : '';
  const checkInValues = [...matchingIds];
  if (checkInYearClause) checkInValues.push(intent.year);
  checkInValues.push(...beneficiaryScopeValues);
  const [checkInRows] = await pool.query(
    `SELECT ml.program_id,
       COUNT(*) AS check_ins,
       COUNT(DISTINCT CONCAT(LOWER(TRIM(ml.beneficiary_type)), ':', ml.beneficiary_id)) AS checked_in_beneficiaries
     FROM monitoring_logs ml
     LEFT JOIN mothers m ON LOWER(TRIM(ml.beneficiary_type)) = 'mother'
       AND (CAST(ml.beneficiary_id AS CHAR) = CAST(m.id AS CHAR) OR LOWER(TRIM(ml.beneficiary_id)) = LOWER(TRIM(CAST(m.mother_code AS CHAR))))
     LEFT JOIN children c ON LOWER(TRIM(ml.beneficiary_type)) = 'child'
       AND (CAST(ml.beneficiary_id AS CHAR) = CAST(c.id AS CHAR) OR LOWER(TRIM(ml.beneficiary_id)) = LOWER(TRIM(CAST(c.child_code AS CHAR))))
     LEFT JOIN mothers parent_m ON parent_m.id = c.mother_id
     WHERE ml.monitored = 1 AND ml.program_id IN (${matchingPlaceholders}) ${checkInYearClause} ${checkInScopeClause}
     GROUP BY ml.program_id`,
    checkInValues,
  );

  const eligibleByProgram = new Map(eligibleRows.map((row) => [Number(row.program_id), toNumber(row.eligible_beneficiaries)]));
  const checkInsByProgram = new Map(checkInRows.map((row) => [Number(row.program_id), {
    checkIns: toNumber(row.check_ins),
    checkedInBeneficiaries: toNumber(row.checked_in_beneficiaries),
  }]));
  const results = candidatePrograms.map((program) => {
    const checkIns = checkInsByProgram.get(Number(program.id)) || { checkIns: 0, checkedInBeneficiaries: 0 };
    return {
      id: Number(program.id),
      name: program.name,
      type: program.type,
      provider: program.provider,
      status: program.status,
      createdAt: program.created_at,
      eligibleBeneficiaries: eligibleByProgram.get(Number(program.id)) || 0,
      ...checkIns,
    };
  });
  const aggregates = results.reduce((total, program) => ({
    programCount: total.programCount + 1,
    eligibleBeneficiaries: total.eligibleBeneficiaries + program.eligibleBeneficiaries,
    checkIns: total.checkIns + program.checkIns,
    checkedInBeneficiaries: total.checkedInBeneficiaries + program.checkedInBeneficiaries,
  }), { programCount: 0, eligibleBeneficiaries: 0, checkIns: 0, checkedInBeneficiaries: 0 });
  const responsePrograms = results.slice(0, 50);
  return {
    answer: buildProgramAssistantAnswer(intent, responsePrograms, aggregates),
    intent,
    aggregates,
    programs: responsePrograms,
    truncated: results.length > responsePrograms.length,
  };
}

module.exports = { createProgramAssistantResult };
