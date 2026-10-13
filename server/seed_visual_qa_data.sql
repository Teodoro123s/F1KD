-- Repeatable synthetic records for exercising community, monitoring, program,
-- user-management, graph, and table views in the local/demo database.
-- Seeded users have no password hash and cannot sign in.
-- Run after the application schema is installed. The existing COM-0001 school
-- is used as an additional anchor for the current demo workspace.

START TRANSACTION;

SET @qa_anchor_school_id = (
  SELECT id FROM communities WHERE community_code = 'COM-0001' LIMIT 1
);

INSERT INTO communities (community_code, name, area) VALUES
  ('DEMO-COM-1001', 'Visual QA School 01', 'Demo Area North'),
  ('DEMO-COM-1002', 'Visual QA School 02', 'Demo Area North'),
  ('DEMO-COM-1003', 'Visual QA School 03', 'Demo Area Central'),
  ('DEMO-COM-1004', 'Visual QA School 04', 'Demo Area Central'),
  ('DEMO-COM-1005', 'Visual QA School 05', 'Demo Area South'),
  ('DEMO-COM-1006', 'Visual QA School 06', 'Demo Area South'),
  ('DEMO-COM-1007', 'Visual QA School 07', 'Demo Area East'),
  ('DEMO-COM-1008', 'Visual QA School 08', 'Demo Area West')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  area = VALUES(area);

INSERT INTO `groups` (group_code, community_id, name, leader, members_count, status)
SELECT CONCAT('DEMO-GRP-1', LPAD(seed.group_no, 3, '0')),
       @qa_anchor_school_id,
       CONCAT('Visual QA Group ', LPAD(seed.group_no, 2, '0')),
       CONCAT('Demo Leader ', LPAD(seed.group_no, 2, '0')),
       18 + MOD(seed.group_no * 7, 24),
       CASE WHEN MOD(seed.group_no, 5) = 0 THEN 'Inactive' ELSE 'Active' END
FROM (
  SELECT 1 AS group_no UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL
  SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL
  SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL
  SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
) AS seed
WHERE @qa_anchor_school_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  community_id = VALUES(community_id),
  name = VALUES(name),
  leader = VALUES(leader),
  members_count = VALUES(members_count),
  status = VALUES(status);

INSERT INTO `groups` (group_code, community_id, name, leader, members_count, status)
SELECT CONCAT('DEMO-GRP-2', LPAD(seed.school_no, 3, '0')),
       community.id,
       CONCAT('Visual QA Group ', LPAD(seed.school_no + 12, 2, '0')),
       CONCAT('Demo Leader ', LPAD(seed.school_no + 12, 2, '0')),
       20 + MOD(seed.school_no * 9, 22),
       'Active'
FROM (
  SELECT 1 AS school_no UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL
  SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL
  SELECT 7 UNION ALL SELECT 8
) AS seed
INNER JOIN communities community
  ON community.community_code = CONCAT('DEMO-COM-1', LPAD(seed.school_no, 3, '0'))
ON DUPLICATE KEY UPDATE
  community_id = VALUES(community_id),
  name = VALUES(name),
  leader = VALUES(leader),
  members_count = VALUES(members_count),
  status = VALUES(status);

INSERT INTO batches (batch_code, community_id, name, records, progress, status)
SELECT CONCAT('DEMO-BAT-1', LPAD(seed.group_no, 3, '0')),
       @qa_anchor_school_id,
       CONCAT('Visual QA Batch ', LPAD(seed.group_no, 2, '0')),
       8 + MOD(seed.group_no * 3, 18),
       MOD(seed.group_no * 17, 101),
       CASE WHEN MOD(seed.group_no, 6) = 0 THEN 'Completed' ELSE 'Active' END
FROM (
  SELECT 1 AS group_no UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL
  SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL
  SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL
  SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
) AS seed
WHERE @qa_anchor_school_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  community_id = VALUES(community_id),
  name = VALUES(name),
  records = VALUES(records),
  progress = VALUES(progress),
  status = VALUES(status);

INSERT INTO batches (batch_code, community_id, name, records, progress, status)
SELECT CONCAT('DEMO-BAT-2', LPAD(seed.school_no, 3, '0')),
       community.id,
       CONCAT('Visual QA Batch ', LPAD(seed.school_no + 12, 2, '0')),
       10 + MOD(seed.school_no * 5, 16),
       MOD(seed.school_no * 23, 101),
       'Active'
FROM (
  SELECT 1 AS school_no UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL
  SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL
  SELECT 7 UNION ALL SELECT 8
) AS seed
INNER JOIN communities community
  ON community.community_code = CONCAT('DEMO-COM-1', LPAD(seed.school_no, 3, '0'))
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
  ON SUBSTRING(batch.batch_code, 10) = SUBSTRING(community_group.group_code, 10)
WHERE community_group.group_code LIKE 'DEMO-GRP-1%'
  AND batch.batch_code LIKE 'DEMO-BAT-1%'
ON DUPLICATE KEY UPDATE group_id = VALUES(group_id);

INSERT INTO group_batch (group_id, batch_id)
SELECT community_group.id, batch.id
FROM `groups` community_group
INNER JOIN batches batch
  ON SUBSTRING(batch.batch_code, 10) = SUBSTRING(community_group.group_code, 10)
WHERE community_group.group_code LIKE 'DEMO-GRP-2%'
  AND batch.batch_code LIKE 'DEMO-BAT-2%'
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
  SELECT record_no + 1 FROM seed_numbers WHERE record_no < 28
),
assignments AS (
  SELECT record_no,
         CASE WHEN record_no <= 12
           THEN CONCAT('DEMO-GRP-1', LPAD(record_no, 3, '0'))
           ELSE CONCAT('DEMO-GRP-2', LPAD(FLOOR((record_no - 13) / 2) + 1, 3, '0'))
         END AS group_code,
         CASE WHEN record_no <= 12
           THEN CONCAT('DEMO-BAT-1', LPAD(record_no, 3, '0'))
           ELSE CONCAT('DEMO-BAT-2', LPAD(FLOOR((record_no - 13) / 2) + 1, 3, '0'))
         END AS batch_code
  FROM seed_numbers
)
SELECT CONCAT('DEMO-M-QA-', LPAD(assignment.record_no, 4, '0')),
       community_group.community_id,
       community_group.id,
       batch.id,
       CONCAT('Visual QA Mother ', LPAD(assignment.record_no, 2, '0')),
       'Synthetic',
       DATE_SUB(CURRENT_DATE, INTERVAL (24 + MOD(assignment.record_no, 15)) YEAR),
       CONCAT('Synthetic QA household ', LPAD(assignment.record_no, 2, '0')),
       DATE_SUB(CURRENT_DATE, INTERVAL (35 + MOD(assignment.record_no * 3, 160)) DAY),
       DATE_ADD(CURRENT_DATE, INTERVAL (280 - (35 + MOD(assignment.record_no * 3, 160))) DAY),
       DATE_SUB(CURRENT_DATE, INTERVAL (20 + MOD(assignment.record_no * 2, 110)) DAY),
       CASE MOD(assignment.record_no, 3)
         WHEN 0 THEN '1st Trimester'
         WHEN 1 THEN '2nd Trimester'
         ELSE '3rd Trimester'
       END,
       8 + MOD(assignment.record_no * 5, 30),
       48.00 + MOD(assignment.record_no * 7, 220) / 10,
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
INNER JOIN `groups` community_group ON community_group.group_code = assignment.group_code
INNER JOIN batches batch ON batch.batch_code = assignment.batch_code
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
  abortion = VALUES(abortion),
  stillbirth = VALUES(stillbirth),
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
WITH RECURSIVE visit_numbers (visit_no) AS (
  SELECT 1
  UNION ALL
  SELECT visit_no + 1 FROM visit_numbers WHERE visit_no < 3
)
SELECT mother.id,
       CASE visit_numbers.visit_no
         WHEN 1 THEN '1st Trimester'
         WHEN 2 THEN '2nd Trimester'
         ELSE '3rd Trimester'
       END,
       1,
       DATE_SUB(CURRENT_DATE, INTERVAL (visit_numbers.visit_no * 28 + MOD(CAST(SUBSTRING(mother.mother_code, 11) AS UNSIGNED), 12)) DAY),
       visit_numbers.visit_no * 12 + MOD(CAST(SUBSTRING(mother.mother_code, 11) AS UNSIGNED), 4),
       CASE WHEN visit_numbers.visit_no = 3 THEN '120/80' ELSE '112/72' END,
       50 + visit_numbers.visit_no * 1.2,
       158,
       20.03 + visit_numbers.visit_no * 0.48,
       CASE WHEN visit_numbers.visit_no = 3 THEN 'Needs Follow-up' ELSE 'Normal' END,
       10 + visit_numbers.visit_no * 8,
       138 + visit_numbers.visit_no * 2,
       'Visual QA Demo Health Worker',
       DATE_ADD(CURRENT_DATE, INTERVAL (visit_numbers.visit_no * 14) DAY),
       visit_numbers.visit_no = 3 AND MOD(CAST(SUBSTRING(mother.mother_code, 11) AS UNSIGNED), 4) = 0,
       visit_numbers.visit_no = 3 AND MOD(CAST(SUBSTRING(mother.mother_code, 11) AS UNSIGNED), 8) = 0,
       'Synthetic demo support',
       'Govt',
       CONCAT('Visual QA synthetic prenatal record ', visit_numbers.visit_no)
FROM mothers mother
CROSS JOIN visit_numbers
WHERE mother.mother_code LIKE 'DEMO-M-QA-%'
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
SELECT CONCAT('DEMO-C-QA-', LPAD(CAST(SUBSTRING(mother.mother_code, 11) AS UNSIGNED), 4, '0')),
       mother.id,
       mother.community_id,
       mother.group_id,
       mother.batch_id,
       CONCAT('Visual QA Child ', LPAD(CAST(SUBSTRING(mother.mother_code, 11) AS UNSIGNED), 2, '0')),
       'Synthetic',
       DATE_SUB(CURRENT_DATE, INTERVAL (2 + MOD(CAST(SUBSTRING(mother.mother_code, 11) AS UNSIGNED) * 3, 26)) MONTH),
       2.80 + MOD(CAST(SUBSTRING(mother.mother_code, 11) AS UNSIGNED) * 7, 90) / 100,
       47 + MOD(CAST(SUBSTRING(mother.mother_code, 11) AS UNSIGNED) * 5, 80) / 10,
       CASE WHEN MOD(CAST(SUBSTRING(mother.mother_code, 11) AS UNSIGNED), 2) = 0 THEN 'Female' ELSE 'Male' END,
       'Normal vaginal delivery',
       CASE WHEN MOD(CAST(SUBSTRING(mother.mother_code, 11) AS UNSIGNED), 5) = 0 THEN 'Needs Follow-up' ELSE 'Active' END,
       'Visual QA Community Health Center',
       'Visual QA Demo Health Worker',
       '9/10',
       CASE WHEN MOD(CAST(SUBSTRING(mother.mother_code, 11) AS UNSIGNED), 3) = 0 THEN 'Bottle feed' ELSE 'Breastfeed' END,
       'Synthetic Visual QA growth and monitoring record.',
       'Demo Parent',
       'Father',
       mother.address,
       CASE MOD(CAST(SUBSTRING(mother.mother_code, 11) AS UNSIGNED), 4)
         WHEN 0 THEN 0
         WHEN 1 THEN 25
         WHEN 2 THEN 60
         ELSE 100
       END
FROM mothers mother
WHERE mother.mother_code LIKE 'DEMO-M-QA-%'
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
WHERE child.child_code LIKE 'DEMO-C-QA-%'
  AND checkup.notes LIKE 'Visual QA synthetic growth check-up%';

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
         WHEN MOD(CAST(SUBSTRING(child.child_code, 11) AS UNSIGNED) + visit_numbers.visit_no, 9) = 0 THEN 'Needs Follow-up'
         ELSE 'Normal'
       END,
       'Visual QA Demo Health Worker',
       CONCAT('Visual QA synthetic growth check-up ', visit_numbers.visit_no)
FROM children child
CROSS JOIN visit_numbers
WHERE child.child_code LIKE 'DEMO-C-QA-%';

INSERT INTO programs (
  name, type, provider, description, beneficiary_type, owner_school_id,
  status, target, received, activities, latest
)
SELECT seed.name, seed.type, 'Visual QA Demo Health Office', seed.description,
       seed.beneficiary_type, @qa_anchor_school_id, 'Active',
       seed.target, seed.received, seed.activities, CURRENT_DATE
FROM (
  SELECT 'Visual QA Maternal Wellness' AS name, 'Health Support' AS type,
         'Synthetic program data for monitoring and report graph/table views.' AS description,
         'Mother' AS beneficiary_type, 28 AS target, 19 AS received, 36 AS activities
  UNION ALL SELECT 'Visual QA Child Growth', 'Nutrition Support',
         'Synthetic growth records with mixed progress for graph and table views.',
         'Child', 28, 17, 42
  UNION ALL SELECT 'Visual QA Family Support', 'Community Support',
         'Synthetic mixed-beneficiary program data across schools, groups, and batches.',
         'Mother and Child', 56, 31, 58
) AS seed
WHERE @qa_anchor_school_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM programs existing WHERE existing.name = seed.name);

UPDATE programs AS p
SET owner_school_id = @qa_anchor_school_id,
    type = CASE p.name
      WHEN 'Visual QA Maternal Wellness' THEN 'Health Support'
      WHEN 'Visual QA Child Growth' THEN 'Nutrition Support'
      ELSE 'Community Support'
    END,
    provider = 'Visual QA Demo Health Office',
    description = CONCAT('Synthetic Visual QA data: ', p.name),
    beneficiary_type = CASE p.name
      WHEN 'Visual QA Maternal Wellness' THEN 'Mother'
      WHEN 'Visual QA Child Growth' THEN 'Child'
      ELSE 'Mother and Child'
    END,
    status = 'Active',
    target = CASE p.name
      WHEN 'Visual QA Family Support' THEN 56
      ELSE 28
    END,
    received = CASE p.name
      WHEN 'Visual QA Maternal Wellness' THEN 19
      WHEN 'Visual QA Child Growth' THEN 17
      ELSE 31
    END,
    activities = CASE p.name
      WHEN 'Visual QA Maternal Wellness' THEN 36
      WHEN 'Visual QA Child Growth' THEN 42
      ELSE 58
    END,
    latest = CURRENT_DATE
WHERE p.name IN (
  'Visual QA Maternal Wellness',
  'Visual QA Child Growth',
  'Visual QA Family Support'
);

INSERT INTO program_clusters (program_id, scope_type, scope_name, beneficiaries, received)
SELECT program.id, scope.scope_type, scope.scope_name, scope.beneficiaries, scope.received
FROM programs program
CROSS JOIN (
  SELECT 'School' AS scope_type, community.name AS scope_name, 28 AS beneficiaries, 19 AS received
  FROM communities community
  WHERE community.community_code = 'COM-0001'
  UNION ALL
  SELECT 'School', community.name, 2, 1
  FROM communities community
  WHERE community.community_code LIKE 'DEMO-COM-1%'
  UNION ALL
  SELECT 'Group', community_group.name, 2, 1
  FROM `groups` community_group
  WHERE community_group.group_code LIKE 'DEMO-GRP-%'
  UNION ALL
  SELECT 'Batch', batch.name, 2, 1
  FROM batches batch
  WHERE batch.batch_code LIKE 'DEMO-BAT-%'
) AS scope
WHERE program.name IN (
  'Visual QA Maternal Wellness',
  'Visual QA Child Growth',
  'Visual QA Family Support'
)
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
SELECT CAST(mother.id AS CHAR),
       'mother',
       program.id,
       CASE WHEN MOD(CAST(SUBSTRING(mother.mother_code, 11) AS UNSIGNED) + report_months.month_no, 4) = 0 THEN 0 ELSE 1 END,
       DATE_ADD('2026-05-13', INTERVAL report_months.month_no MONTH),
       NULL,
       CONCAT('Visual QA synthetic maternal support month ', report_months.month_no)
FROM mothers mother
INNER JOIN programs program ON program.name IN ('Visual QA Maternal Wellness', 'Visual QA Family Support')
CROSS JOIN report_months
WHERE mother.mother_code LIKE 'DEMO-M-QA-%'
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
SELECT CAST(child.id AS CHAR),
       'child',
       program.id,
       CASE WHEN MOD(CAST(SUBSTRING(child.child_code, 11) AS UNSIGNED) + report_months.month_no, 5) = 0 THEN 0 ELSE 1 END,
       DATE_ADD('2026-05-13', INTERVAL report_months.month_no MONTH),
       NULL,
       CONCAT('Visual QA synthetic child nutrition month ', report_months.month_no)
FROM children child
INNER JOIN programs program ON program.name IN ('Visual QA Child Growth', 'Visual QA Family Support')
CROSS JOIN report_months
WHERE child.child_code LIKE 'DEMO-C-QA-%'
ON DUPLICATE KEY UPDATE
  monitored = VALUES(monitored),
  notes = VALUES(notes);

INSERT INTO users (
  first_name, last_name, contact_number, email, gender, dob,
  location, role, status, school_id, group_id, password_hash,
  consent_accepted_at, must_change_password
)
SELECT CONCAT('Visual QA ', seed.role_label, ' ', LPAD(seed.user_no, 2, '0')),
       'Test Account',
       CONCAT('0999000', LPAD(seed.user_no, 4, '0')),
       CONCAT('visual-qa-', LPAD(seed.user_no, 2, '0'), '@example.invalid'),
       CASE WHEN MOD(seed.user_no, 2) = 0 THEN 'Female' ELSE 'Male' END,
       DATE_SUB(CURRENT_DATE, INTERVAL (25 + seed.user_no) YEAR),
       community.area,
       seed.role_name,
       CASE WHEN MOD(seed.user_no, 6) = 0 THEN 'Suspended' ELSE 'Active' END,
       community.id,
       CASE WHEN seed.role_name = 'Health worker' THEN community_group.id ELSE NULL END,
       NULL,
       NULL,
       0
FROM (
  SELECT 1 AS user_no, 'Admin' AS role_name, 'Admin' AS role_label, 'DEMO-COM-1001' AS community_code UNION ALL
  SELECT 2, 'Admin', 'Admin', 'DEMO-COM-1002' UNION ALL
  SELECT 3, 'Admin', 'Admin', 'DEMO-COM-1003' UNION ALL
  SELECT 4, 'Partner', 'Partner', 'DEMO-COM-1004' UNION ALL
  SELECT 5, 'Partner', 'Partner', 'DEMO-COM-1005' UNION ALL
  SELECT 6, 'Partner', 'Partner', 'DEMO-COM-1006' UNION ALL
  SELECT 7, 'Community Organizer', 'Organizer', 'DEMO-COM-1001' UNION ALL
  SELECT 8, 'Community Organizer', 'Organizer', 'DEMO-COM-1002' UNION ALL
  SELECT 9, 'Community Organizer', 'Organizer', 'DEMO-COM-1003' UNION ALL
  SELECT 10, 'Health worker', 'Health Worker', 'DEMO-COM-1004' UNION ALL
  SELECT 11, 'Health worker', 'Health Worker', 'DEMO-COM-1005' UNION ALL
  SELECT 12, 'Health worker', 'Health Worker', 'DEMO-COM-1006'
) AS seed
INNER JOIN communities community ON community.community_code = seed.community_code
LEFT JOIN `groups` community_group ON community_group.community_id = community.id
  AND community_group.group_code = CONCAT(
    'DEMO-GRP-2',
    LPAD(CAST(SUBSTRING(seed.community_code, 11) AS UNSIGNED), 3, '0')
  )
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
