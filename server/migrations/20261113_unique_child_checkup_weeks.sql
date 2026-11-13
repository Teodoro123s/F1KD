-- Prevent concurrent submissions from creating more than one check-up per child and week.
-- Existing duplicates are not changed; the ALTER fails explicitly if any are present.
-- Runtime bootstrap applies the same uniqueness check on existing databases.
SELECT child_id, week_number, COUNT(*) AS duplicate_count
FROM child_checkups
WHERE week_number IS NOT NULL
GROUP BY child_id, week_number
HAVING COUNT(*) > 1;

SET @has_child_week_unique_index = (
  SELECT COUNT(*)
  FROM (
    SELECT index_name
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'child_checkups'
      AND non_unique = 0
    GROUP BY index_name
    HAVING GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') = 'child_id,week_number'
  ) AS existing_indexes
);

SET @child_week_index_sql = IF(
  @has_child_week_unique_index > 0,
  'SELECT 1',
  'ALTER TABLE child_checkups ADD UNIQUE KEY uq_child_checkups_child_week (child_id, week_number)'
);
PREPARE child_week_index_statement FROM @child_week_index_sql;
EXECUTE child_week_index_statement;
DEALLOCATE PREPARE child_week_index_statement;
