function getProgramVisibilityFilter(req, alias = 'p') {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) {
    throw new Error('Invalid program table alias.');
  }
  if (req.groupId) {
    return {
      sql: `WHERE (
        EXISTS (
          SELECT 1
          FROM program_clusters scoped_cluster
          INNER JOIN \`groups\` assigned_group ON assigned_group.id = ?
          WHERE scoped_cluster.program_id = ${alias}.id
            AND (
              (scoped_cluster.scope_type = 'Group' AND scoped_cluster.scope_name = assigned_group.name)
              OR (scoped_cluster.scope_type = 'School' AND EXISTS (
                SELECT 1 FROM communities scoped_school
                WHERE scoped_school.id = assigned_group.community_id AND scoped_school.name = scoped_cluster.scope_name
              ))
              OR (scoped_cluster.scope_type = 'Batch' AND EXISTS (
                SELECT 1 FROM group_batch scoped_group_batch
                INNER JOIN batches scoped_batch ON scoped_batch.id = scoped_group_batch.batch_id
                WHERE scoped_group_batch.group_id = assigned_group.id AND scoped_batch.name = scoped_cluster.scope_name
              ))
            )
        )
      )`,
      values: [req.groupId],
    };
  }
  if (req.schoolId) {
    return {
      sql: `WHERE (
        NOT EXISTS (SELECT 1 FROM program_clusters scoped_cluster WHERE scoped_cluster.program_id = ${alias}.id)
        OR EXISTS (
          SELECT 1
          FROM program_clusters scoped_cluster
          WHERE scoped_cluster.program_id = ${alias}.id
            AND (
              (scoped_cluster.scope_type = 'School' AND EXISTS (
                SELECT 1 FROM communities scoped_school
                WHERE scoped_school.id = ? AND scoped_school.name = scoped_cluster.scope_name
              ))
              OR (scoped_cluster.scope_type = 'Group' AND EXISTS (
                SELECT 1 FROM \`groups\` scoped_group
                WHERE scoped_group.community_id = ? AND scoped_group.name = scoped_cluster.scope_name
              ))
              OR (scoped_cluster.scope_type = 'Batch' AND EXISTS (
                SELECT 1 FROM batches scoped_batch
                WHERE scoped_batch.community_id = ? AND scoped_batch.name = scoped_cluster.scope_name
              ))
            )
        )
      )`,
      values: [req.schoolId, req.schoolId, req.schoolId],
    };
  }
  return { sql: '', values: [] };
}

module.exports = { getProgramVisibilityFilter };
