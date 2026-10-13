-- Repeatable synthetic coverage for the Program -> cluster -> Receipt History flow.
-- Run after seed_visual_qa_data.sql and seed_visual_qa_assigned_school.sql.
-- Never run against a production database.

START TRANSACTION;

SET @qa_school_id = (
  SELECT id FROM communities WHERE community_code = 'COM-0002' LIMIT 1
);
SET @qa_school_name = (
  SELECT name FROM communities WHERE id = @qa_school_id
);

INSERT INTO programs (
  name, type, provider, description, beneficiary_type, owner_school_id,
  status, target, received, activities, latest, ended, starts_on, ends_on
)
SELECT seed.name, 'Visual QA', 'Visual QA Demo Health Office', seed.description,
       'Mother and Child', @qa_school_id, seed.status, 40, 0, 0, NULL,
       CASE WHEN seed.status = 'Ended' THEN CURRENT_DATE ELSE NULL END,
       seed.starts_on, seed.ends_on
FROM (
  SELECT 'Visual QA Receipt Matrix - Active' AS name,
         'Active program with mixed mother/child receipt outcomes, inclusive schedule boundaries, and inherited school-to-group/batch scopes.' AS description,
         'Active' AS status, DATE('2026-10-01') AS starts_on, DATE('2026-10-31') AS ends_on
  UNION ALL
  SELECT 'Visual QA Receipt Matrix - Ended',
         'Ended program with retained receipt history; use to verify read-only receipt behavior.',
         'Ended', DATE('2026-10-01'), DATE('2026-10-31')
  UNION ALL
  SELECT 'Visual QA Receipt Matrix - Legacy',
         'Legacy program without schedule dates; history remains readable while new receipt entry is unavailable.',
         'Active', NULL, NULL
) AS seed
WHERE @qa_school_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM programs existing WHERE existing.name = seed.name
  );

UPDATE programs
SET type = 'Visual QA',
    provider = 'Visual QA Demo Health Office',
    description = CASE name
      WHEN 'Visual QA Receipt Matrix - Active'
        THEN 'Active program with mixed mother/child receipt outcomes, inclusive schedule boundaries, and inherited school-to-group/batch scopes.'
      WHEN 'Visual QA Receipt Matrix - Ended'
        THEN 'Ended program with retained receipt history; use to verify read-only receipt behavior.'
      ELSE 'Legacy program without schedule dates; history remains readable while new receipt entry is unavailable.'
    END,
    beneficiary_type = 'Mother and Child',
    owner_school_id = @qa_school_id,
    status = CASE WHEN name = 'Visual QA Receipt Matrix - Ended' THEN 'Ended' ELSE 'Active' END,
    target = 40,
    ended = CASE WHEN name = 'Visual QA Receipt Matrix - Ended' THEN CURRENT_DATE ELSE NULL END,
    starts_on = CASE
      WHEN name IN ('Visual QA Receipt Matrix - Active', 'Visual QA Receipt Matrix - Ended') THEN '2026-10-01'
      ELSE NULL
    END,
    ends_on = CASE
      WHEN name IN ('Visual QA Receipt Matrix - Active', 'Visual QA Receipt Matrix - Ended') THEN '2026-10-31'
      ELSE NULL
    END
WHERE name IN (
  'Visual QA Receipt Matrix - Active',
  'Visual QA Receipt Matrix - Ended',
  'Visual QA Receipt Matrix - Legacy'
)
  AND @qa_school_id IS NOT NULL;

INSERT INTO program_clusters (program_id, scope_type, scope_name, beneficiaries, received)
SELECT program.id, 'School', @qa_school_name, 40, 0
FROM programs program
WHERE program.name IN (
  'Visual QA Receipt Matrix - Active',
  'Visual QA Receipt Matrix - Ended',
  'Visual QA Receipt Matrix - Legacy'
)
  AND @qa_school_name IS NOT NULL
ON DUPLICATE KEY UPDATE
  beneficiaries = VALUES(beneficiaries);

INSERT INTO monitoring_logs (
  beneficiary_id, beneficiary_type, program_id, monitored,
  monitored_date, monitored_by, notes
)
SELECT CAST(beneficiary.id AS CHAR),
       'mother',
       program.id,
       CASE
         WHEN MOD(CAST(SUBSTRING_INDEX(beneficiary.mother_code, '-', -1) AS UNSIGNED), 4) = 0 THEN FALSE
         WHEN dates.receipt_date = '2026-10-01' THEN MOD(CAST(SUBSTRING_INDEX(beneficiary.mother_code, '-', -1) AS UNSIGNED), 4) <> 1
         WHEN dates.receipt_date = '2026-10-31' THEN MOD(CAST(SUBSTRING_INDEX(beneficiary.mother_code, '-', -1) AS UNSIGNED), 4) <> 2
         ELSE MOD(CAST(SUBSTRING_INDEX(beneficiary.mother_code, '-', -1) AS UNSIGNED), 4) = 3
       END,
       dates.receipt_date,
       NULL,
       CONCAT('Synthetic receipt matrix mother outcome for ', dates.receipt_date)
FROM mothers beneficiary
CROSS JOIN (
  SELECT DATE('2026-10-01') AS receipt_date
  UNION ALL SELECT DATE('2026-10-13')
  UNION ALL SELECT DATE('2026-10-31')
) dates
INNER JOIN programs program ON program.name = 'Visual QA Receipt Matrix - Active'
WHERE beneficiary.mother_code LIKE 'DEMO-M-DAS-QA-%'
  AND beneficiary.community_id = @qa_school_id
ON DUPLICATE KEY UPDATE
  monitored = VALUES(monitored),
  monitored_by = VALUES(monitored_by),
  notes = VALUES(notes);

INSERT INTO monitoring_logs (
  beneficiary_id, beneficiary_type, program_id, monitored,
  monitored_date, monitored_by, notes
)
SELECT CAST(beneficiary.id AS CHAR),
       'child',
       program.id,
       CASE
         WHEN MOD(CAST(SUBSTRING_INDEX(beneficiary.child_code, '-', -1) AS UNSIGNED), 4) = 0 THEN FALSE
         WHEN dates.receipt_date = '2026-10-01' THEN MOD(CAST(SUBSTRING_INDEX(beneficiary.child_code, '-', -1) AS UNSIGNED), 4) <> 1
         WHEN dates.receipt_date = '2026-10-31' THEN MOD(CAST(SUBSTRING_INDEX(beneficiary.child_code, '-', -1) AS UNSIGNED), 4) <> 2
         ELSE MOD(CAST(SUBSTRING_INDEX(beneficiary.child_code, '-', -1) AS UNSIGNED), 4) = 3
       END,
       dates.receipt_date,
       NULL,
       CONCAT('Synthetic receipt matrix child outcome for ', dates.receipt_date)
FROM children beneficiary
LEFT JOIN mothers parent ON parent.id = beneficiary.mother_id
CROSS JOIN (
  SELECT DATE('2026-10-01') AS receipt_date
  UNION ALL SELECT DATE('2026-10-13')
  UNION ALL SELECT DATE('2026-10-31')
) dates
INNER JOIN programs program ON program.name = 'Visual QA Receipt Matrix - Active'
WHERE beneficiary.child_code LIKE 'DEMO-C-DAS-QA-%'
  AND COALESCE(beneficiary.community_id, parent.community_id) = @qa_school_id
ON DUPLICATE KEY UPDATE
  monitored = VALUES(monitored),
  monitored_by = VALUES(monitored_by),
  notes = VALUES(notes);

INSERT INTO monitoring_logs (
  beneficiary_id, beneficiary_type, program_id, monitored,
  monitored_date, monitored_by, notes
)
SELECT CAST(beneficiary.id AS CHAR),
       'mother',
       program.id,
       MOD(CAST(SUBSTRING_INDEX(beneficiary.mother_code, '-', -1) AS UNSIGNED), 3) <> 0,
       '2026-10-01',
       NULL,
       'Synthetic ended-program receipt history.'
FROM mothers beneficiary
INNER JOIN programs program ON program.name = 'Visual QA Receipt Matrix - Ended'
WHERE beneficiary.mother_code LIKE 'DEMO-M-DAS-QA-%'
  AND beneficiary.community_id = @qa_school_id
ON DUPLICATE KEY UPDATE
  monitored = VALUES(monitored),
  monitored_by = VALUES(monitored_by),
  notes = VALUES(notes);

INSERT INTO monitoring_logs (
  beneficiary_id, beneficiary_type, program_id, monitored,
  monitored_date, monitored_by, notes
)
SELECT CAST(beneficiary.id AS CHAR),
       'child',
       program.id,
       MOD(CAST(SUBSTRING_INDEX(beneficiary.child_code, '-', -1) AS UNSIGNED), 3) <> 0,
       '2026-10-01',
       NULL,
       'Synthetic ended-program receipt history.'
FROM children beneficiary
LEFT JOIN mothers parent ON parent.id = beneficiary.mother_id
INNER JOIN programs program ON program.name = 'Visual QA Receipt Matrix - Ended'
WHERE beneficiary.child_code LIKE 'DEMO-C-DAS-QA-%'
  AND COALESCE(beneficiary.community_id, parent.community_id) = @qa_school_id
ON DUPLICATE KEY UPDATE
  monitored = VALUES(monitored),
  monitored_by = VALUES(monitored_by),
  notes = VALUES(notes);

INSERT INTO monitoring_logs (
  beneficiary_id, beneficiary_type, program_id, monitored,
  monitored_date, monitored_by, notes
)
SELECT CAST(beneficiary.id AS CHAR),
       'mother',
       program.id,
       MOD(CAST(SUBSTRING_INDEX(beneficiary.mother_code, '-', -1) AS UNSIGNED), 2) = 0,
       '2026-09-30',
       NULL,
       'Synthetic legacy receipt retained without program schedule dates.'
FROM mothers beneficiary
INNER JOIN programs program ON program.name = 'Visual QA Receipt Matrix - Legacy'
WHERE beneficiary.mother_code LIKE 'DEMO-M-DAS-QA-%'
  AND beneficiary.community_id = @qa_school_id
ON DUPLICATE KEY UPDATE
  monitored = VALUES(monitored),
  monitored_by = VALUES(monitored_by),
  notes = VALUES(notes);

UPDATE programs program
SET program.received = (
  SELECT COUNT(DISTINCT CONCAT(LOWER(TRIM(log_entry.beneficiary_type)), ':', log_entry.beneficiary_id))
  FROM monitoring_logs log_entry
  WHERE log_entry.program_id = program.id AND log_entry.monitored = 1
)
WHERE program.name IN (
  'Visual QA Receipt Matrix - Active',
  'Visual QA Receipt Matrix - Ended',
  'Visual QA Receipt Matrix - Legacy'
);

UPDATE program_clusters cluster
INNER JOIN programs program ON program.id = cluster.program_id
SET cluster.received = program.received
WHERE program.name IN (
  'Visual QA Receipt Matrix - Active',
  'Visual QA Receipt Matrix - Ended',
  'Visual QA Receipt Matrix - Legacy'
)
  AND cluster.scope_type = 'School'
  AND cluster.scope_name = @qa_school_name;

COMMIT;
