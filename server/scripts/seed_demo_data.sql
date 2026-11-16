-- Synthetic demo data for a development/test database only.
-- Creates one school, two groups, three batches, ten mothers per batch, and
-- seven children per batch. The first two mothers and children in each batch
-- have all profile fields used by the app's completion checks.
--
-- Re-running this script updates records with these DEMO-* codes and replaces
-- their demo vaccine, dental, and monitoring records. It does not create
-- document files.

USE f1kd;

INSERT INTO communities (community_code, name, area)
VALUES ('DEMO-SCHOOL-01', 'Sample School', 'Sample District')
ON DUPLICATE KEY UPDATE name = 'Sample School', area = 'Sample District';

INSERT INTO groups (group_code, community_id, name, leader, members_count, status)
SELECT 'DEMO-GRP-01', id, 'Sample Group 1', 'Sample Leader', 20, 'Active'
FROM communities
WHERE community_code = 'DEMO-SCHOOL-01'
ON DUPLICATE KEY UPDATE
  community_id = (SELECT id FROM communities WHERE community_code = 'DEMO-SCHOOL-01'),
  name = 'Sample Group 1',
  leader = 'Sample Leader',
  members_count = 20,
  status = 'Active';

INSERT INTO groups (group_code, community_id, name, leader, members_count, status)
SELECT 'DEMO-GRP-02', id, 'Sample Group 2', 'Sample Leader', 10, 'Active'
FROM communities
WHERE community_code = 'DEMO-SCHOOL-01'
ON DUPLICATE KEY UPDATE
  community_id = (SELECT id FROM communities WHERE community_code = 'DEMO-SCHOOL-01'),
  name = 'Sample Group 2',
  leader = 'Sample Leader',
  members_count = 10,
  status = 'Active';

INSERT INTO batches (batch_code, community_id, name, records, progress, status)
SELECT 'DEMO-BAT-01', id, 'Sample Batch 1', 10, 0, 'Active'
FROM communities
WHERE community_code = 'DEMO-SCHOOL-01'
ON DUPLICATE KEY UPDATE
  community_id = (SELECT id FROM communities WHERE community_code = 'DEMO-SCHOOL-01'),
  name = 'Sample Batch 1',
  records = 10,
  progress = 0,
  status = 'Active';

INSERT INTO batches (batch_code, community_id, name, records, progress, status)
SELECT 'DEMO-BAT-02', id, 'Sample Batch 2', 10, 0, 'Active'
FROM communities
WHERE community_code = 'DEMO-SCHOOL-01'
ON DUPLICATE KEY UPDATE
  community_id = (SELECT id FROM communities WHERE community_code = 'DEMO-SCHOOL-01'),
  name = 'Sample Batch 2',
  records = 10,
  progress = 0,
  status = 'Active';

INSERT INTO batches (batch_code, community_id, name, records, progress, status)
SELECT 'DEMO-BAT-03', id, 'Sample Batch 3', 10, 0, 'Active'
FROM communities
WHERE community_code = 'DEMO-SCHOOL-01'
ON DUPLICATE KEY UPDATE
  community_id = (SELECT id FROM communities WHERE community_code = 'DEMO-SCHOOL-01'),
  name = 'Sample Batch 3',
  records = 10,
  progress = 0,
  status = 'Active';

DELETE gb
FROM group_batch gb
JOIN batches b ON b.id = gb.batch_id
WHERE b.batch_code IN ('DEMO-BAT-01', 'DEMO-BAT-02', 'DEMO-BAT-03');

INSERT INTO group_batch (group_id, batch_id)
SELECT g.id, b.id
FROM groups g
JOIN batches b ON b.batch_code IN ('DEMO-BAT-01', 'DEMO-BAT-02')
WHERE g.group_code = 'DEMO-GRP-01'
UNION ALL
SELECT g.id, b.id
FROM groups g
JOIN batches b ON b.batch_code = 'DEMO-BAT-03'
WHERE g.group_code = 'DEMO-GRP-02';

INSERT INTO mothers (
  mother_code, community_id, group_id, batch_id, first_name, middle_name, last_name,
  maiden_surname, dob, contact_number, address, civil_status,
  employment_status, educational_attainment, emergency_name,
  emergency_contact, emergency_relationship, lmp_date, edd_date,
  prenatal_reg_date, trimester, gestational_age, prenatal_weight,
  prenatal_bp, prenatal_height, gravida, para, abortion, stillbirth,
  total_children, children_born_alive, miscarriages,
  children_died_after_birth, other_medical_history, status
)
SELECT
  CONCAT('DEMO-M', LPAD(n, 3, '0')),
  c.id,
  g.id,
  b.id,
  ELT(MOD(n - 1, 10) + 1, 'Ana', 'Maria', 'Lara', 'Elena', 'Sofia',
      'Nina', 'Carla', 'Rosa', 'Mila', 'Isabel'),
  IF(MOD(n - 1, 10) < 2, 'Sample', NULL),
  ELT(FLOOR((n - 1) / 10) + 1, 'Santos', 'Reyes', 'Cruz'),
  IF(MOD(n - 1, 10) < 2, 'Sample', NULL),
  IF(MOD(n - 1, 10) < 2, DATE_SUB('1990-01-01', INTERVAL n DAY), NULL),
  IF(MOD(n - 1, 10) < 2, CONCAT('000000000', LPAD(n, 2, '0')), NULL),
  IF(MOD(n - 1, 10) < 2, 'Sample Province, Sample City, Sample Barangay', NULL),
  IF(MOD(n - 1, 10) < 2, 'Married', NULL),
  IF(MOD(n - 1, 10) < 2, 'Employed', NULL),
  IF(MOD(n - 1, 10) < 2, 'Secondary', NULL),
  IF(MOD(n - 1, 10) < 2, 'Sample Emergency Contact', NULL),
  IF(MOD(n - 1, 10) < 2, CONCAT('000000001', LPAD(n, 2, '0')), NULL),
  IF(MOD(n - 1, 10) < 2, 'Family', NULL),
  IF(MOD(n - 1, 10) < 2, '2025-12-01', NULL),
  IF(MOD(n - 1, 10) < 2, '2026-09-07', NULL),
  IF(MOD(n - 1, 10) < 2, '2026-06-01', NULL),
  IF(MOD(n - 1, 10) < 2, '3rd Trimester', NULL),
  IF(MOD(n - 1, 10) < 2, 30, NULL),
  IF(MOD(n - 1, 10) < 2, 60.0, NULL),
  IF(MOD(n - 1, 10) < 2, '110/70', NULL),
  IF(MOD(n - 1, 10) < 2, 155.0, NULL),
  IF(MOD(n - 1, 10) < 2, 1, NULL),
  IF(MOD(n - 1, 10) < 2, 1, NULL),
  IF(MOD(n - 1, 10) < 2, 0, NULL),
  IF(MOD(n - 1, 10) < 2, 0, NULL),
  IF(MOD(n - 1, 10) < 2, 1, NULL),
  IF(MOD(n - 1, 10) < 2, 1, NULL),
  IF(MOD(n - 1, 10) < 2, 0, NULL),
  IF(MOD(n - 1, 10) < 2, 0, NULL),
  IF(MOD(n - 1, 10) < 2, 'No known medical history (synthetic sample)', NULL),
  'Active'
FROM (
  SELECT tens.digit * 10 + ones.digit + 1 AS n
  FROM (
    SELECT 0 AS digit UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
    UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
  ) ones
  CROSS JOIN (SELECT 0 AS digit UNION ALL SELECT 1 UNION ALL SELECT 2) tens
) numbers
JOIN communities c ON c.community_code = 'DEMO-SCHOOL-01'
JOIN batches b ON b.batch_code = CONCAT('DEMO-BAT-', LPAD(FLOOR((n - 1) / 10) + 1, 2, '0'))
JOIN group_batch gb ON gb.batch_id = b.id
JOIN groups g ON g.id = gb.group_id
ON DUPLICATE KEY UPDATE
  community_id = VALUES(community_id),
  group_id = VALUES(group_id),
  batch_id = VALUES(batch_id),
  first_name = VALUES(first_name),
  middle_name = VALUES(middle_name),
  last_name = VALUES(last_name),
  maiden_surname = VALUES(maiden_surname),
  dob = VALUES(dob),
  contact_number = VALUES(contact_number),
  address = VALUES(address),
  civil_status = VALUES(civil_status),
  employment_status = VALUES(employment_status),
  educational_attainment = VALUES(educational_attainment),
  emergency_name = VALUES(emergency_name),
  emergency_contact = VALUES(emergency_contact),
  emergency_relationship = VALUES(emergency_relationship),
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
  total_children = VALUES(total_children),
  children_born_alive = VALUES(children_born_alive),
  miscarriages = VALUES(miscarriages),
  children_died_after_birth = VALUES(children_died_after_birth),
  other_medical_history = VALUES(other_medical_history),
  status = VALUES(status);

DELETE mv
FROM mother_vaccinations mv
JOIN mothers m ON m.id = mv.mother_id
WHERE m.mother_code LIKE 'DEMO-M%';

DELETE md
FROM mother_dental_records md
JOIN mothers m ON m.id = md.mother_id
WHERE m.mother_code LIKE 'DEMO-M%';

INSERT INTO mother_vaccinations (mother_id, vaccine_name, vaccine_date, remarks)
SELECT m.id, vaccines.vaccine_name, vaccines.vaccine_date, 'Synthetic demo record'
FROM mothers m
JOIN (
  SELECT 'DEMO-M001' AS mother_code UNION ALL SELECT 'DEMO-M002'
  UNION ALL SELECT 'DEMO-M011' UNION ALL SELECT 'DEMO-M012'
  UNION ALL SELECT 'DEMO-M021' UNION ALL SELECT 'DEMO-M022'
) complete_mothers ON complete_mothers.mother_code = m.mother_code
CROSS JOIN (
  SELECT 'TT1' AS vaccine_name, '2024-01-01' AS vaccine_date
  UNION ALL SELECT 'TT2', '2024-02-01'
  UNION ALL SELECT 'TT3', '2024-03-01'
  UNION ALL SELECT 'TT4', '2024-04-01'
  UNION ALL SELECT 'TT5', '2024-05-01'
) vaccines;

INSERT INTO mother_dental_records (
  mother_id, visit_date, dental_facility, dentist_in_charge,
  community_dentist, dentist_license, dentist_contact, teeth_count,
  dental_findings, dental_remarks
)
SELECT
  m.id, '2026-06-15', 'Sample Dental Clinic', 'Sample Dentist',
  'Sample Community Dentist', 'DEMO-LICENSE', '00000000000', 28,
  'No urgent findings (synthetic sample)', 'Synthetic demo record'
FROM mothers m
WHERE m.mother_code IN (
  'DEMO-M001', 'DEMO-M002', 'DEMO-M011', 'DEMO-M012', 'DEMO-M021', 'DEMO-M022'
);

INSERT INTO children (
  child_code, mother_id, community_id, group_id, batch_id,
  first_name, middle_name, last_name, birth_date, birth_weight, birth_length,
  gender, blood_type, no_of_child_delivered, multiple_birth_type,
  expanded_newborn_screening, delivery_type, birth_attendant,
  apgar_score, nutrition_notes
)
SELECT
  CONCAT('DEMO-C', LPAD(n, 3, '0')),
  m.id,
  c.id,
  g.id,
  b.id,
  ELT(MOD(n - 1, 7) + 1, 'Alex', 'Sam', 'Jamie', 'Robin', 'Taylor', 'Casey', 'Riley'),
  IF(MOD(n - 1, 7) < 2, 'Sample', NULL),
  ELT(FLOOR((n - 1) / 7) + 1, 'Sample', 'Demo', 'Example'),
  IF(MOD(n - 1, 7) < 2, '2026-01-15', '2026-02-15'),
  IF(MOD(n - 1, 7) < 2, 3.0, NULL),
  IF(MOD(n - 1, 7) < 2, 49.0, NULL),
  IF(MOD(n - 1, 7) < 2, 'Female', 'Other'),
  IF(MOD(n - 1, 7) < 2, 'O+', NULL),
  IF(MOD(n - 1, 7) < 2, 1, NULL),
  IF(MOD(n - 1, 7) < 2, 'Single', NULL),
  IF(MOD(n - 1, 7) < 2, 'Done', NULL),
  IF(MOD(n - 1, 7) < 2, 'Normal delivery', NULL),
  IF(MOD(n - 1, 7) < 2, 'Sample Birth Attendant', NULL),
  IF(MOD(n - 1, 7) < 2, '8/9', NULL),
  IF(MOD(n - 1, 7) < 2, 'Synthetic demo sample', NULL)
FROM (
  SELECT tens.digit * 10 + ones.digit + 1 AS n
  FROM (
    SELECT 0 AS digit UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7
    UNION ALL SELECT 8 UNION ALL SELECT 9
  ) ones
  CROSS JOIN (SELECT 0 AS digit UNION ALL SELECT 1 UNION ALL SELECT 2) tens
) numbers
JOIN communities c ON c.community_code = 'DEMO-SCHOOL-01'
JOIN batches b ON b.batch_code = CONCAT('DEMO-BAT-', LPAD(FLOOR((n - 1) / 7) + 1, 2, '0'))
JOIN group_batch gb ON gb.batch_id = b.id
JOIN groups g ON g.id = gb.group_id
JOIN mothers m ON m.mother_code = CONCAT(
  'DEMO-M',
  LPAD(FLOOR((n - 1) / 7) * 10 + MOD(n - 1, 7) + 1, 3, '0')
)
WHERE n <= 21
ON DUPLICATE KEY UPDATE
  mother_id = VALUES(mother_id),
  community_id = VALUES(community_id),
  group_id = VALUES(group_id),
  batch_id = VALUES(batch_id),
  first_name = VALUES(first_name),
  middle_name = VALUES(middle_name),
  last_name = VALUES(last_name),
  birth_date = VALUES(birth_date),
  birth_weight = VALUES(birth_weight),
  birth_length = VALUES(birth_length),
  gender = VALUES(gender),
  blood_type = VALUES(blood_type),
  no_of_child_delivered = VALUES(no_of_child_delivered),
  multiple_birth_type = VALUES(multiple_birth_type),
  expanded_newborn_screening = VALUES(expanded_newborn_screening),
  delivery_type = VALUES(delivery_type),
  birth_attendant = VALUES(birth_attendant),
  apgar_score = VALUES(apgar_score),
  nutrition_notes = VALUES(nutrition_notes);

DELETE mc
FROM mother_checkups mc
JOIN mothers m ON m.id = mc.mother_id
WHERE m.mother_code LIKE 'DEMO-M%';

INSERT INTO mother_checkups (
  mother_id, trimester, checkup_number, checkup_date, gestational_age_weeks,
  blood_pressure, weight_kg, height_cm, bmi, developmental_status,
  nutritional_status, fundal_height_cm, fetal_heart_rate_bpm,
  service_provider, facility_type, remarks
)
SELECT
  m.id,
  IF(m.mother_code IN (
    'DEMO-M001', 'DEMO-M002', 'DEMO-M011', 'DEMO-M012', 'DEMO-M021', 'DEMO-M022'
  ), '3rd Trimester', '1st Trimester'),
  steps.checkup_number,
  IF(m.mother_code IN (
    'DEMO-M001', 'DEMO-M002', 'DEMO-M011', 'DEMO-M012', 'DEMO-M021', 'DEMO-M022'
  ),
    DATE_ADD('2026-06-15', INTERVAL (steps.checkup_number - 1) MONTH),
    DATE_ADD('2026-01-15', INTERVAL CAST(SUBSTRING(m.mother_code, 7) AS UNSIGNED) DAY)
  ),
  IF(m.mother_code IN (
    'DEMO-M001', 'DEMO-M002', 'DEMO-M011', 'DEMO-M012', 'DEMO-M021', 'DEMO-M022'
  ), 28 + (steps.checkup_number - 1) * 4, 8),
  '110/70',
  60.0 + steps.checkup_number * 0.5,
  155.0,
  ROUND((60.0 + steps.checkup_number * 0.5) / (1.55 * 1.55), 2),
  'Normal',
  'Normal',
  IF(m.mother_code IN (
    'DEMO-M001', 'DEMO-M002', 'DEMO-M011', 'DEMO-M012', 'DEMO-M021', 'DEMO-M022'
  ), 28 + (steps.checkup_number - 1) * 4, 8),
  145,
  'Sample Health Worker',
  'Health Center',
  'Synthetic demo monitoring check-up'
FROM mothers m
CROSS JOIN (
  SELECT 1 AS checkup_number UNION ALL SELECT 2 UNION ALL SELECT 3
) steps
WHERE m.mother_code LIKE 'DEMO-M%'
  AND (
    m.mother_code IN (
      'DEMO-M001', 'DEMO-M002', 'DEMO-M011', 'DEMO-M012', 'DEMO-M021', 'DEMO-M022'
    )
    OR steps.checkup_number = 1
  );

UPDATE mothers
SET progress = IF(mother_code IN (
  'DEMO-M001', 'DEMO-M002', 'DEMO-M011', 'DEMO-M012', 'DEMO-M021', 'DEMO-M022'
), 100, 11)
WHERE mother_code LIKE 'DEMO-M%';

DELETE cc
FROM child_checkups cc
JOIN children ch ON ch.id = cc.child_id
WHERE ch.child_code LIKE 'DEMO-C%';

INSERT INTO child_checkups (
  child_id, next_checkup_date, visit_date, weight, height,
  head_circumference, exclusive_breastfeeding, laboratory_assistance_provided,
  referred_to_hospital, facility_type, developmental_status,
  service_provider, notes, week_number
)
SELECT
  ch.id,
  NULL,
  DATE_ADD(ch.birth_date, INTERVAL weeks.week_number WEEK),
  ROUND(COALESCE(ch.birth_weight, 3.0) + weeks.week_number * 0.08, 2),
  ROUND(COALESCE(ch.birth_length, 49.0) + weeks.week_number * 0.35, 2),
  ROUND(COALESCE(ch.head_circumference, 34.0) + weeks.week_number * 0.12, 2),
  'Yes',
  FALSE,
  FALSE,
  'Health Center',
  'Normal',
  'Sample Health Worker',
  'Synthetic demo monitoring check-up',
  weeks.week_number
FROM children ch
CROSS JOIN (
  SELECT 1 AS week_number UNION ALL SELECT 4 UNION ALL SELECT 8
) weeks
WHERE ch.child_code LIKE 'DEMO-C%';

SELECT
  b.batch_code,
  COUNT(DISTINCT m.id) AS mother_count,
  COUNT(DISTINCT ch.id) AS child_count,
  COUNT(DISTINCT mc.id) AS mother_checkup_count,
  COUNT(DISTINCT cc.id) AS child_checkup_count
FROM batches b
LEFT JOIN mothers m ON m.batch_id = b.id AND m.mother_code LIKE 'DEMO-M%'
LEFT JOIN children ch ON ch.batch_id = b.id AND ch.child_code LIKE 'DEMO-C%'
LEFT JOIN mother_checkups mc ON mc.mother_id = m.id
LEFT JOIN child_checkups cc ON cc.child_id = ch.id
WHERE b.batch_code IN ('DEMO-BAT-01', 'DEMO-BAT-02', 'DEMO-BAT-03')
GROUP BY b.id, b.batch_code
ORDER BY b.batch_code;
