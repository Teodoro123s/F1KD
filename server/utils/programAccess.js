function validateAlias(alias) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) {
    throw new Error('Invalid program table alias.');
  }
}

function getProgramClusterVisibilityFilter(req, alias = 'pc') {
  validateAlias(alias);
  if (req.groupId) {
    return {
      sql: `(
        ( ${alias}.scope_type = 'Group' AND EXISTS (
          SELECT 1 FROM \`groups\` assigned_group
          WHERE assigned_group.id = ?
            AND (
              ${alias}.scope_id = assigned_group.id
              OR (${alias}.scope_id IS NULL
                AND ${alias}.scope_name = assigned_group.name
                AND NOT EXISTS (
                  SELECT 1 FROM \`groups\` duplicate_group
                  WHERE duplicate_group.name = ${alias}.scope_name
                    AND duplicate_group.id <> assigned_group.id
                ))
            )
        ))
        OR (${alias}.scope_type = 'School' AND EXISTS (
          SELECT 1 FROM \`groups\` assigned_group
          INNER JOIN communities assigned_school ON assigned_school.id = assigned_group.community_id
          WHERE assigned_group.id = ?
            AND (
              ${alias}.scope_id = assigned_school.id
              OR (${alias}.scope_id IS NULL
                AND ${alias}.scope_name = assigned_school.name
                AND NOT EXISTS (
                  SELECT 1 FROM communities duplicate_school
                  WHERE duplicate_school.name = ${alias}.scope_name
                    AND duplicate_school.id <> assigned_school.id
                ))
            )
        ))
        OR (${alias}.scope_type = 'Batch' AND EXISTS (
          SELECT 1 FROM \`groups\` assigned_group
          INNER JOIN group_batch assigned_link ON assigned_link.group_id = assigned_group.id
          INNER JOIN batches assigned_batch ON assigned_batch.id = assigned_link.batch_id
          WHERE assigned_group.id = ?
            AND (
              ${alias}.scope_id = assigned_batch.id
              OR (${alias}.scope_id IS NULL
                AND ${alias}.scope_name = assigned_batch.name
                AND NOT EXISTS (
                  SELECT 1 FROM batches duplicate_batch
                  WHERE duplicate_batch.name = ${alias}.scope_name
                    AND duplicate_batch.id <> assigned_batch.id
                ))
            )
        ))
      )`,
      values: [req.groupId, req.groupId, req.groupId],
    };
  }
  if (req.schoolId) {
    return {
      sql: `(
        (${alias}.scope_type = 'School' AND EXISTS (
          SELECT 1 FROM communities scoped_school
          WHERE scoped_school.id = ?
            AND (
              ${alias}.scope_id = scoped_school.id
              OR (${alias}.scope_id IS NULL
                AND ${alias}.scope_name = scoped_school.name
                AND NOT EXISTS (
                  SELECT 1 FROM communities duplicate_school
                  WHERE duplicate_school.name = ${alias}.scope_name
                    AND duplicate_school.id <> scoped_school.id
                ))
            )
        ))
        OR (${alias}.scope_type = 'Group' AND EXISTS (
          SELECT 1 FROM \`groups\` scoped_group
          WHERE scoped_group.community_id = ?
            AND (
              ${alias}.scope_id = scoped_group.id
              OR (${alias}.scope_id IS NULL
                AND ${alias}.scope_name = scoped_group.name
                AND NOT EXISTS (
                  SELECT 1 FROM \`groups\` duplicate_group
                  WHERE duplicate_group.name = ${alias}.scope_name
                    AND duplicate_group.id <> scoped_group.id
                ))
            )
        ))
        OR (${alias}.scope_type = 'Batch' AND EXISTS (
          SELECT 1 FROM batches scoped_batch
          WHERE scoped_batch.community_id = ?
            AND (
              ${alias}.scope_id = scoped_batch.id
              OR (${alias}.scope_id IS NULL
                AND ${alias}.scope_name = scoped_batch.name
                AND NOT EXISTS (
                  SELECT 1 FROM batches duplicate_batch
                  WHERE duplicate_batch.name = ${alias}.scope_name
                    AND duplicate_batch.id <> scoped_batch.id
                ))
            )
        ))
      )`,
      values: [req.schoolId, req.schoolId, req.schoolId],
    };
  }
  return { sql: '', values: [] };
}

function getProgramVisibilityFilter(req, alias = 'p') {
  validateAlias(alias);
  if (req.groupId) {
    const clusterFilter = getProgramClusterVisibilityFilter(req, 'scoped_cluster');
    return {
      sql: `WHERE EXISTS (
        SELECT 1 FROM program_clusters scoped_cluster
        WHERE scoped_cluster.program_id = ${alias}.id
          AND ${clusterFilter.sql}
      )`,
      values: clusterFilter.values,
    };
  }
  if (req.schoolId) {
    const clusterFilter = getProgramClusterVisibilityFilter(req, 'scoped_cluster');
    return {
      sql: `WHERE (
        NOT EXISTS (SELECT 1 FROM program_clusters scoped_cluster WHERE scoped_cluster.program_id = ${alias}.id)
        OR EXISTS (
          SELECT 1 FROM program_clusters scoped_cluster
          WHERE scoped_cluster.program_id = ${alias}.id
            AND ${clusterFilter.sql}
        )
      )`,
      values: clusterFilter.values,
    };
  }
  return { sql: '', values: [] };
}

module.exports = { getProgramClusterVisibilityFilter, getProgramVisibilityFilter };
