-- Extra repeatable synthetic data for the currently assigned demo school
-- (COM-0002 / DASNHS) so school-scoped accounts can see QA records too.
-- Run only in a local/demo database after seed_visual_qa_data.sql.
-- Synthetic QA users have no password hash and cannot sign in.

START TRANSACTION;

SET @qa_school_id = (
  SELECT id FROM communities WHERE community_code = 'COM-0002' LIMIT 1
);
SET @qa_school_name = (
  SELECT name FROM communities WHERE id = @qa_school_id LIMIT 1
);

INSERT INTO `groups` (group_code, community_id, name, leader, members_count, status)
SELECT CONCAT('DEMO-GRP-3', LPAD(seed.group_no, 3, '0')),
       @qa_school_id,
       CONCAT('Visual QA DAS Group ', LPAD(seed.group_no, 2, '0')),
       CONCAT('Visual QA Leader ', LPAD(seed.group_no, 2, '0')),
       16 + seed.group_no * 3,
       CASE WHEN seed.group_no = 4 THEN 'Inactive' ELSE 'Active' END
FROM (
  SELECT 1 AS group_no UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
) AS seed
WHERE @qa_school_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  community_id = VALUES(community_id),
  name = VALUES(name),
  leader = VALUES(leader),
  members_count = VALUES(members_count),
  status = VALUES(status);

INSERT INTO batches (batch_code, community_id, name, records, progress, status)
SELECT CONCAT('DEMO-BAT-3', LPAD(seed.batch_no, 3, '0')),
       @qa_school_id,
       CONCAT('Visual QA DAS Batch ', LPAD(seed.batch_no, 2, '0')),
       5 + seed.batch_no * 2,
       MOD(seed.batch_no * 19, 101),
       CASE WHEN seed.batch_no = 8 THEN 'Completed' ELSE 'Active' END
FROM (
  SELECT 1 AS batch_no UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL
  SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL
  SELECT 7 UNION ALL SELECT 8
) AS seed
WHERE @qa_school_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  community_id = VALUES(community_id),
  name = VALUES(name),
  records = VALUES(records),
  progress = VALUES(progress),
  status = VALUES(status);

INSERT INTO group_batch (group_id, batch_id)
SELECT community_group.id, batch.id
FROM `groups` community_group
INNER JOIN batches batch
  ON batch.batch_code = CONCAT(
    'DEMO-BAT-3',
    LPAD((CAST(SUBSTRING(community_group.group_code, 11) AS UNSIGNED) - 1) * 2 + 1, 3, '0')
  )
WHERE community_group.group_code LIKE 'DEMO-GRP-3%'
ON DUPLICATE KEY UPDATE group_id = VALUES(group_id);

INSERT INTO group_batch (group_id, batch_id)
SELECT community_group.id, batch.id
FROM `groups` community_group
INNER JOIN batches batch
  ON batch.batch_code = CONCAT(
    'DEMO-BAT-3',
    LPAD((CAST(SUBSTRING(community_group.group_code, 11) AS UNSIGNED) - 1) * 2 + 2, 3, '0')
  )
WHERE community_group.group_code LIKE 'DEMO-GRP-3%'
ON DUPLICATE KEY UPDATE group_id = VALUES(group_id);

INSERT INTO mothers (
  mother_code, community_id, group_id, batch_id, first_name, last_name,
  dob, address, lmp_date, edd_date, prenatal_reg_date, trimester,
  gestational_age, prenatal_weight, prenatal_bp, prenatal_height,
  gravida, para, abortion, stillbirth, status, visits, progress,
  is_high_risk, philhealth_member
)
WITH RECURSIVE seed_numbers (record_no) AS (
  SELECT 1
  UNION ALL
  SELECT record_no + 1 FROM seed_numbers WHERE record_no < 20
),
assignments AS (
  SELECT record_no,
         FLOOR((record_no - 1) / 5) + 1 AS group_no,
         FLOOR((record_no - 1) / 5) * 2 + MOD(record_no - 1, 2) + 1 AS batch_no
  FROM seed_numbers
)
SELECT CONCAT('DEMO-M-DAS-QA-', LPAD(assignment.record_no, 4, '0')),
       community_group.community_id,
       community_group.id,
       batch.id,
       CONCAT('DAS QA Mother ', LPAD(assignment.record_no, 2, '0')),
       'Synthetic',
       DATE_SUB(CURRENT_DATE, INTERVAL (24 + MOD(assignment.record_no, 15)) YEAR),
       CONCAT('Synthetic DAS QA household ', LPAD(assignment.record_no, 2, '0')),
       DATE_SUB(CURRENT_DATE, INTERVAL (20 + MOD(assignment.record_no * 11, 240)) DAY),
       DATE_ADD(CURRENT_DATE, INTERVAL (280 - (20 + MOD(assignment.record_no * 11, 240))) DAY),
       DATE_SUB(CURRENT_DATE, INTERVAL (10 + MOD(assignment.record_no * 3, 60)) DAY),
       CASE
         WHEN 20 + MOD(assignment.record_no * 11, 240) < 90 THEN '1st Trimester'
         WHEN 20 + MOD(assignment.record_no * 11, 240) < 180 THEN '2nd Trimester'
         ELSE '3rd Trimester'
       END,
       FLOOR((20 + MOD(assignment.record_no * 11, 240)) / 7),
       50 + MOD(assignment.record_no * 7, 170) / 10,
       CASE MOD(assignment.record_no, 4)
         WHEN 0 THEN '110/70'
         WHEN 1 THEN '118/76'
         WHEN 2 THEN '124/82'
         ELSE '106/68'
       END,
       150 + MOD(assignment.record_no * 3, 21),
       1 + MOD(assignment.record_no, 4),
       MOD(assignment.record_no, 3),
       0,
       0,
       CASE WHEN MOD(assignment.record_no, 7) = 0 THEN 'Inactive' ELSE 'Active' END,
       MOD(assignment.record_no, 10),
       CASE MOD(assignment.record_no, 4)
         WHEN 0 THEN 0
         WHEN 1 THEN 25
         WHEN 2 THEN 60
         ELSE 100
       END,
       MOD(assignment.record_no, 6) = 0,
       0
FROM assignments assignment
INNER JOIN `groups` community_group
  ON community_group.group_code = CONCAT('DEMO-GRP-3', LPAD(assignment.group_no, 3, '0'))
INNER JOIN batches batch
  ON batch.batch_code = CONCAT('DEMO-BAT-3', LPAD(assignment.batch_no, 3, '0'))
ON DUPLICATE KEY UPDATE
  community_id = VALUES(community_id),
  group_id = VALUES(group_id),
  batch_id = VALUES(batch_id),
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  dob = VALUES(dob),
  address = VALUES(address),
  lmp_date = VALUES(lmp_date),
  edd_date = VALUES(edd_date),
  prenatal_reg_date = VALUES(prenatal_reg_date),
  trimester = VALUES(trimester),
  gestational_age = VALUES(gestational_age),
  prenatal_weight = VALUES(prenatal_weight),
  prenatal_bp = VALUES(prenatal_bp),
  prenatal_height = VALUES(prenatal_height),
  gravida = VALUES(gravida),
  para = VALUES(para),
  status = VALUES(status),
  visits = VALUES(visits),
  progress = VALUES(progress),
  is_high_risk = VALUES(is_high_risk),
  philhealth_member = VALUES(philhealth_member);

INSERT INTO mother_checkups (
  mother_id, trimester, checkup_number, checkup_date,
  gestational_age_weeks, blood_pressure, weight_kg, height_cm, bmi,
  nutritional_status, fundal_height_cm, fetal_heart_rate_bpm,
  service_provider, next_checkup_date, referred_to_hospital,
  lab_assistance_provided, source_of_funds, facility_type, remarks
)
SELECT mother.id,
       seed.trimester,
       1,
       DATE_SUB(CURRENT_DATE, INTERVAL seed.visit_days DAY),
       seed.gestational_age,
       CASE WHEN MOD(seed.record_no, 6) = 0 THEN '128/84' ELSE '112/72' END,
       51 + seed.record_no / 10,
       158,
       20.43 + seed.record_no / 100,
       CASE WHEN MOD(seed.record_no, 6) = 0 THEN 'Needs Follow-up' ELSE 'Normal' END,
       12 + seed.record_no,
       138 + MOD(seed.record_no, 15),
       'DAS Visual QA Health Worker',
       DATE_ADD(CURRENT_DATE, INTERVAL (7 + MOD(seed.record_no, 21)) DAY),
       MOD(seed.record_no, 6) = 0,
       MOD(seed.record_no, 12) = 0,
       'Synthetic DAS QA support',
       'Govt',
       CONCAT('Synthetic DAS QA prenatal check-up ', seed.record_no)
FROM (
  SELECT CAST(SUBSTRING(mother_code, 15) AS UNSIGNED) AS record_no,
         mother_code,
         trimester,
         gestational_age,
         MOD(CAST(SUBSTRING(mother_code, 15) AS UNSIGNED) * 13, 90) + 5 AS visit_days
  FROM mothers
  WHERE mother_code LIKE 'DEMO-M-DAS-QA-%'
) seed
INNER JOIN mothers mother ON mother.mother_code = seed.mother_code
ON DUPLICATE KEY UPDATE
  checkup_date = VALUES(checkup_date),
  gestational_age_weeks = VALUES(gestational_age_weeks),
  blood_pressure = VALUES(blood_pressure),
  weight_kg = VALUES(weight_kg),
  bmi = VALUES(bmi),
  nutritional_status = VALUES(nutritional_status),
  fundal_height_cm = VALUES(fundal_height_cm),
  fetal_heart_rate_bpm = VALUES(fetal_heart_rate_bpm),
  next_checkup_date = VALUES(next_checkup_date),
  referred_to_hospital = VALUES(referred_to_hospital),
  lab_assistance_provided = VALUES(lab_assistance_provided),
  remarks = VALUES(remarks);

INSERT INTO children (
  child_code, mother_id, community_id, group_id, batch_id, first_name,
  last_name, birth_date, birth_weight, birth_length, gender,
  delivery_type, health_status, birth_place, birth_attendant, apgar_score,
  feeding_type, nutrition_notes, father_name, relationship, address, progress
)
SELECT CONCAT('DEMO-C-DAS-QA-', LPAD(CAST(SUBSTRING(mother.mother_code, 15) AS UNSIGNED), 4, '0')),
       mother.id, mother.community_id, mother.group_id, mother.batch_id,
       CONCAT('DAS QA Child ', LPAD(CAST(SUBSTRING(mother.mother_code, 15) AS UNSIGNED), 2, '0')),
       'Synthetic',
       DATE_SUB(CURRENT_DATE, INTERVAL (2 + MOD(CAST(SUBSTRING(mother.mother_code, 15) AS UNSIGNED) * 3, 22)) MONTH),
       2.80 + MOD(CAST(SUBSTRING(mother.mother_code, 15) AS UNSIGNED) * 7, 90) / 100,
       47 + MOD(CAST(SUBSTRING(mother.mother_code, 15) AS UNSIGNED) * 5, 80) / 10,
       CASE WHEN MOD(CAST(SUBSTRING(mother.mother_code, 15) AS UNSIGNED), 2) = 0 THEN 'Female' ELSE 'Male' END,
       'Normal vaginal delivery',
       CASE WHEN MOD(CAST(SUBSTRING(mother.mother_code, 15) AS UNSIGNED), 5) = 0 THEN 'Needs Follow-up' ELSE 'Active' END,
       'DAS Visual QA Health Center',
       'DAS Visual QA Health Worker',
       '9/10',
       CASE WHEN MOD(CAST(SUBSTRING(mother.mother_code, 15) AS UNSIGNED), 3) = 0 THEN 'Bottle feed' ELSE 'Breastfeed' END,
       'Synthetic DAS Visual QA growth record.',
       'Demo Parent',
       'Father',
       mother.address,
       CASE MOD(CAST(SUBSTRING(mother.mother_code, 15) AS UNSIGNED), 4)
         WHEN 0 THEN 0
         WHEN 1 THEN 25
         WHEN 2 THEN 60
         ELSE 100
       END
FROM mothers mother
WHERE mother.mother_code LIKE 'DEMO-M-DAS-QA-%'
ON DUPLICATE KEY UPDATE
  mother_id = VALUES(mother_id),
  community_id = VALUES(community_id),
  group_id = VALUES(group_id),
  batch_id = VALUES(batch_id),
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  birth_date = VALUES(birth_date),
  birth_weight = VALUES(birth_weight),
  birth_length = VALUES(birth_length),
  gender = VALUES(gender),
  health_status = VALUES(health_status),
  feeding_type = VALUES(feeding_type),
  nutrition_notes = VALUES(nutrition_notes),
  address = VALUES(address),
  progress = VALUES(progress);

DELETE checkup
FROM child_checkups checkup
INNER JOIN children child ON child.id = checkup.child_id
WHERE child.child_code LIKE 'DEMO-C-DAS-QA-%'
  AND checkup.notes LIKE 'Synthetic DAS QA growth check-up%';

INSERT INTO child_checkups (
  child_id, week_number, visit_date, next_checkup_date, weight, height,
  head_circumference, developmental_status, service_provider, notes
)
WITH RECURSIVE visit_numbers (visit_no) AS (
  SELECT 1
  UNION ALL
  SELECT visit_no + 1 FROM visit_numbers WHERE visit_no < 6
)
SELECT child.id,
       visit_numbers.visit_no,
       DATE_ADD(child.birth_date, INTERVAL visit_numbers.visit_no MONTH),
       DATE_ADD(child.birth_date, INTERVAL (visit_numbers.visit_no + 1) MONTH),
       ROUND(child.birth_weight + visit_numbers.visit_no * 0.34, 2),
       ROUND(child.birth_length + visit_numbers.visit_no * 1.15, 1),
       ROUND(34 + visit_numbers.visit_no * 0.35, 1),
       CASE
         WHEN MOD(CAST(SUBSTRING(child.child_code, 15) AS UNSIGNED) + visit_numbers.visit_no, 7) = 0 THEN 'Needs Follow-up'
         ELSE 'Normal'
       END,
       'DAS Visual QA Health Worker',
       CONCAT('Synthetic DAS QA growth check-up ', visit_numbers.visit_no)
FROM children child
CROSS JOIN visit_numbers
WHERE child.child_code LIKE 'DEMO-C-DAS-QA-%';

UPDATE programs
SET owner_school_id = @qa_school_id
WHERE name IN (
  'Visual QA Maternal Wellness',
  'Visual QA Child Growth',
  'Visual QA Family Support'
)
  AND @qa_school_id IS NOT NULL;

INSERT INTO program_clusters (program_id, scope_type, scope_name, beneficiaries, received)
SELECT program.id,
       scope.scope_type,
       scope.scope_name,
       scope.beneficiaries,
       scope.received
FROM programs program
CROSS JOIN (
  SELECT 'School' AS scope_type, @qa_school_name AS scope_name, 20 AS beneficiaries, 14 AS received
  UNION ALL
  SELECT 'Group', community_group.name, 5, 3
  FROM `groups` community_group
  WHERE community_group.group_code LIKE 'DEMO-GRP-3%'
  UNION ALL
  SELECT 'Batch', batch.name, 3, 2
  FROM batches batch
  WHERE batch.batch_code LIKE 'DEMO-BAT-3%'
) scope
WHERE program.name IN (
  'Visual QA Maternal Wellness',
  'Visual QA Child Growth',
  'Visual QA Family Support'
)
  AND scope.scope_name IS NOT NULL
ON DUPLICATE KEY UPDATE
  beneficiaries = VALUES(beneficiaries),
  received = VALUES(received);

INSERT INTO monitoring_logs (
  beneficiary_id, beneficiary_type, program_id, monitored,
  monitored_date, monitored_by, notes
)
WITH RECURSIVE report_months (month_no) AS (
  SELECT 1
  UNION ALL
  SELECT month_no + 1 FROM report_months WHERE month_no < 5
)
SELECT CAST(beneficiary.id AS CHAR),
       'mother',
       program.id,
       CASE WHEN MOD(CAST(SUBSTRING(beneficiary.mother_code, 15) AS UNSIGNED) + report_months.month_no, 4) = 0 THEN 0 ELSE 1 END,
       DATE_ADD('2026-05-13', INTERVAL report_months.month_no MONTH),
       NULL,
       CONCAT('Synthetic DAS QA maternal monitoring month ', report_months.month_no)
FROM mothers beneficiary
INNER JOIN programs program
  ON program.name IN ('Visual QA Maternal Wellness', 'Visual QA Family Support')
CROSS JOIN report_months
WHERE beneficiary.mother_code LIKE 'DEMO-M-DAS-QA-%'
ON DUPLICATE KEY UPDATE
  monitored = VALUES(monitored),
  notes = VALUES(notes);

INSERT INTO monitoring_logs (
  beneficiary_id, beneficiary_type, program_id, monitored,
  monitored_date, monitored_by, notes
)
WITH RECURSIVE report_months (month_no) AS (
  SELECT 1
  UNION ALL
  SELECT month_no + 1 FROM report_months WHERE month_no < 5
)
SELECT CAST(beneficiary.id AS CHAR),
       'child',
       program.id,
       CASE WHEN MOD(CAST(SUBSTRING(beneficiary.child_code, 15) AS UNSIGNED) + report_months.month_no, 5) = 0 THEN 0 ELSE 1 END,
       DATE_ADD('2026-05-13', INTERVAL report_months.month_no MONTH),
       NULL,
       CONCAT('Synthetic DAS QA child monitoring month ', report_months.month_no)
FROM children beneficiary
INNER JOIN programs program
  ON program.name IN ('Visual QA Child Growth', 'Visual QA Family Support')
CROSS JOIN report_months
WHERE beneficiary.child_code LIKE 'DEMO-C-DAS-QA-%'
ON DUPLICATE KEY UPDATE
  monitored = VALUES(monitored),
  notes = VALUES(notes);

INSERT INTO users (
  first_name, last_name, contact_number, email, gender, dob,
  location, role, status, school_id, group_id, password_hash,
  consent_accepted_at, must_change_password
)
SELECT CONCAT('DAS Visual QA ', seed.role_label, ' ', LPAD(seed.user_no, 2, '0')),
       'Test Account',
       CONCAT('0999888', LPAD(seed.user_no, 4, '0')),
       CONCAT('das-visual-qa-', LPAD(seed.user_no, 2, '0'), '@example.invalid'),
       CASE WHEN MOD(seed.user_no, 2) = 0 THEN 'Female' ELSE 'Male' END,
       DATE_SUB(CURRENT_DATE, INTERVAL (25 + seed.user_no) YEAR),
       @qa_school_name,
       seed.role_name,
       CASE WHEN seed.user_no = 6 THEN 'Suspended' ELSE 'Active' END,
       @qa_school_id,
       CASE WHEN seed.role_name = 'Health worker' THEN community_group.id ELSE NULL END,
       NULL,
       NULL,
       0
FROM (
  SELECT 1 AS user_no, 'Admin' AS role_name, 'Admin' AS role_label UNION ALL
  SELECT 2, 'Partner', 'Partner' UNION ALL
  SELECT 3, 'Community Organizer', 'Organizer' UNION ALL
  SELECT 4, 'Health worker', 'Health Worker' UNION ALL
  SELECT 5, 'Health worker', 'Health Worker' UNION ALL
  SELECT 6, 'Health worker', 'Health Worker'
) seed
LEFT JOIN `groups` community_group
  ON community_group.group_code = CONCAT(
    'DEMO-GRP-3',
    LPAD(MOD(seed.user_no - 1, 4) + 1, 3, '0')
  )
WHERE @qa_school_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  contact_number = VALUES(contact_number),
  gender = VALUES(gender),
  dob = VALUES(dob),
  location = VALUES(location),
  role = VALUES(role),
  status = VALUES(status),
  school_id = VALUES(school_id),
  group_id = VALUES(group_id),
  password_hash = NULL,
  consent_accepted_at = NULL,
  must_change_password = 0;

COMMIT;
