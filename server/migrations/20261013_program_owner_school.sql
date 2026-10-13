ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS owner_school_id INT NULL;

UPDATE programs p
JOIN (
  SELECT CAST(entity_id AS UNSIGNED) AS program_id, MIN(school_id) AS school_id
  FROM notifications
  WHERE event_type = 'program.created'
    AND entity_type = 'program'
    AND entity_id REGEXP '^[0-9]+$'
    AND school_id IS NOT NULL
  GROUP BY entity_id
  HAVING COUNT(DISTINCT school_id) = 1
) created ON created.program_id = p.id
SET p.owner_school_id = created.school_id
WHERE p.owner_school_id IS NULL;
