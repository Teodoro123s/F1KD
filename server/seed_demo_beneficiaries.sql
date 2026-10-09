-- Idempotent synthetic beneficiary data for local/demo environments.
-- Run against the target f1kd database after the monitoring schema is installed.
-- Requires COM-0001 / GRP-0001 / BAT-0001 to exist.
-- Includes maternal hospital referrals, program records, and monitored benefits.
-- Safe to run more than once; only DEMO-M-/DEMO-C- records and DEMO programs are changed.

START TRANSACTION;

SET @demo_community_id = (
  SELECT id FROM communities WHERE community_code = 'COM-0001' LIMIT 1
);
SET @demo_group_id = (
  SELECT id FROM groups
  WHERE group_code = 'GRP-0001' AND community_id = @demo_community_id
  LIMIT 1
);
SET @demo_batch_id = (
  SELECT id FROM batches
  WHERE batch_code = 'BAT-0001' AND community_id = @demo_community_id
  LIMIT 1
);

INSERT INTO mothers (
  mother_code, community_id, group_id, batch_id,
  first_name, middle_name, last_name, dob, address,
  lmp_date, edd_date, prenatal_reg_date, trimester, gestational_age,
  prenatal_weight, prenatal_bp, prenatal_height,
  gravida, para, abortion, stillbirth, status, visits, progress,
  philhealth_member
) VALUES
  ('DEMO-M-0001', @demo_community_id, @demo_group_id, @demo_batch_id,
   'Maya', NULL, 'Sample', '1998-04-12', 'Demo household 1',
   '2026-07-20', '2027-04-26', '2026-08-26', '1st Trimester', 11,
   56.00, '110/70', '158', 2, 1, 0, 0, 'Active', 2, 13, 0),
  ('DEMO-M-0002', @demo_community_id, @demo_group_id, @demo_batch_id,
   'Lea', NULL, 'Example', '1995-09-03', 'Demo household 2',
   '2026-01-15', '2026-10-22', '2026-03-10', '3rd Trimester', 38,
   61.00, '112/72', '160', 2, 1, 0, 0, 'Active', 9, 100, 0),
  ('DEMO-M-0003', @demo_community_id, @demo_group_id, @demo_batch_id,
   'Nina', NULL, 'Demo', '2000-01-20', 'Demo household 3',
   '2026-07-01', '2027-04-07', '2026-08-05', '2nd Trimester', 14,
   53.50, '108/68', '155', 1, 0, 0, 0, 'Active', 5, 33, 0),
  ('DEMO-M-0004', @demo_community_id, @demo_group_id, @demo_batch_id,
   'Rosa', NULL, 'Training', '1997-06-18', 'Demo household 4',
   '2026-09-01', '2027-06-08', '2026-10-01', '1st Trimester', 5,
   58.00, '114/74', '162', 1, 0, 0, 0, 'Active', 0, 0, 0)
ON DUPLICATE KEY UPDATE
  community_id = VALUES(community_id),
  group_id = VALUES(group_id),
  batch_id = VALUES(batch_id),
  first_name = VALUES(first_name),
  middle_name = VALUES(middle_name),
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
  philhealth_member = VALUES(philhealth_member);

INSERT INTO mother_checkups (
  mother_id, trimester, checkup_number, checkup_date, gestational_age_weeks,
  blood_pressure, weight_kg, height_cm, bmi, nutritional_status,
  fundal_height_cm, fetal_heart_rate_bpm, service_provider,
  next_checkup_date, referred_to_hospital, lab_assistance_provided,
  source_of_funds, facility_type, remarks
)
SELECT m.id, seed.trimester, seed.checkup_number, seed.checkup_date, seed.gestational_age_weeks,
       seed.blood_pressure, seed.weight_kg, seed.height_cm, seed.bmi, seed.nutritional_status,
       seed.fundal_height_cm, seed.fetal_heart_rate_bpm, 'Demo Health Worker',
       seed.next_checkup_date, 0, 0, 'Municipal Fund', 'Govt', seed.remarks
FROM (
  SELECT 'DEMO-M-0001' AS mother_code, '1st Trimester' AS trimester, 1 AS checkup_number,
         '2026-08-26' AS checkup_date, 5 AS gestational_age_weeks, '110/70' AS blood_pressure,
         56.40 AS weight_kg, 158.00 AS height_cm, 22.59 AS bmi, 'Normal' AS nutritional_status,
         8.00 AS fundal_height_cm, 138 AS fetal_heart_rate_bpm, '2026-09-16' AS next_checkup_date,
         'Routine first prenatal visit' AS remarks
  UNION ALL SELECT 'DEMO-M-0001', '1st Trimester', 2, '2026-09-16', 8, '112/72', 57.00, 158.00, 22.83, 'Normal', 10.00, 140, '2026-10-07', 'Follow-up completed'
  UNION ALL SELECT 'DEMO-M-0002', '1st Trimester', 1, '2026-03-10', 8, '110/70', 61.20, 160.00, 23.91, 'Normal', 10.00, 140, '2026-04-07', 'Routine prenatal visit'
  UNION ALL SELECT 'DEMO-M-0002', '1st Trimester', 2, '2026-04-07', 12, '112/72', 62.00, 160.00, 24.22, 'Normal', 13.00, 142, '2026-05-05', 'Routine prenatal visit'
  UNION ALL SELECT 'DEMO-M-0002', '1st Trimester', 3, '2026-05-05', 16, '110/70', 62.80, 160.00, 24.53, 'Normal', 16.00, 144, '2026-05-26', 'Trimester review'
  UNION ALL SELECT 'DEMO-M-0002', '2nd Trimester', 1, '2026-05-26', 19, '114/74', 63.40, 160.00, 24.77, 'Normal', 20.00, 144, '2026-06-16', 'Routine prenatal visit'
  UNION ALL SELECT 'DEMO-M-0002', '2nd Trimester', 2, '2026-06-16', 22, '112/70', 64.10, 160.00, 25.04, 'Normal', 23.00, 146, '2026-07-14', 'Routine prenatal visit'
  UNION ALL SELECT 'DEMO-M-0002', '2nd Trimester', 3, '2026-07-14', 26, '114/72', 64.80, 160.00, 25.31, 'Normal', 27.00, 148, '2026-08-11', 'Trimester review'
  UNION ALL SELECT 'DEMO-M-0002', '3rd Trimester', 1, '2026-08-11', 30, '116/74', 65.40, 160.00, 25.55, 'Overweight', 30.00, 148, '2026-09-08', 'Routine prenatal visit'
  UNION ALL SELECT 'DEMO-M-0002', '3rd Trimester', 2, '2026-09-08', 34, '118/76', 66.00, 160.00, 25.78, 'Overweight', 34.00, 150, '2026-10-06', 'Routine prenatal visit'
  UNION ALL SELECT 'DEMO-M-0002', '3rd Trimester', 3, '2026-10-06', 38, '118/76', 66.40, 160.00, 25.94, 'Overweight', 37.00, 150, NULL, 'Final scheduled prenatal check-up'
  UNION ALL SELECT 'DEMO-M-0003', '1st Trimester', 1, '2026-08-05', 5, '108/68', 53.80, 155.00, 22.39, 'Normal', 8.00, 138, '2026-08-26', 'Routine first prenatal visit'
  UNION ALL SELECT 'DEMO-M-0003', '1st Trimester', 2, '2026-08-26', 8, '110/70', 54.10, 155.00, 22.52, 'Normal', 10.00, 140, '2026-09-16', 'Follow-up completed'
  UNION ALL SELECT 'DEMO-M-0003', '1st Trimester', 3, '2026-09-16', 11, '112/72', 54.50, 155.00, 22.68, 'Normal', 13.00, 142, '2026-10-07', 'Trimester review'
  UNION ALL SELECT 'DEMO-M-0003', '2nd Trimester', 1, '2026-10-07', 14, '110/70', 55.00, 155.00, 22.89, 'Normal', 16.00, 144, '2026-10-28', 'Routine prenatal visit'
  UNION ALL SELECT 'DEMO-M-0003', '2nd Trimester', 2, '2026-10-09', 14, '112/72', 55.20, 155.00, 22.97, 'Normal', 17.00, 144, '2026-10-30', 'Additional follow-up'
) AS seed
INNER JOIN mothers m ON m.mother_code = seed.mother_code
ON DUPLICATE KEY UPDATE
  checkup_date = VALUES(checkup_date),
  gestational_age_weeks = VALUES(gestational_age_weeks),
  blood_pressure = VALUES(blood_pressure),
  weight_kg = VALUES(weight_kg),
  height_cm = VALUES(height_cm),
  bmi = VALUES(bmi),
  nutritional_status = VALUES(nutritional_status),
  fundal_height_cm = VALUES(fundal_height_cm),
  fetal_heart_rate_bpm = VALUES(fetal_heart_rate_bpm),
  service_provider = VALUES(service_provider),
  next_checkup_date = VALUES(next_checkup_date),
  referred_to_hospital = VALUES(referred_to_hospital),
  lab_assistance_provided = VALUES(lab_assistance_provided),
  source_of_funds = VALUES(source_of_funds),
  facility_type = VALUES(facility_type),
  remarks = VALUES(remarks);

UPDATE mother_checkups checkup
INNER JOIN mothers mother ON mother.id = checkup.mother_id
SET checkup.referred_to_hospital = 1,
    checkup.lab_assistance_provided = 1,
    checkup.assistance_amount = 2500.00,
    checkup.source_of_funds = 'Demo Municipal Health Fund',
    checkup.facility_type = 'Govt',
    checkup.remarks = 'Synthetic demo referral: referred for follow-up assessment.'
WHERE mother.mother_code = 'DEMO-M-0002'
  AND checkup.trimester = '3rd Trimester'
  AND checkup.checkup_number = 1;

UPDATE mother_checkups checkup
INNER JOIN mothers mother ON mother.id = checkup.mother_id
SET checkup.referred_to_hospital = 1,
    checkup.lab_assistance_provided = 0,
    checkup.assistance_amount = NULL,
    checkup.source_of_funds = 'Demo Rural Health Unit',
    checkup.facility_type = 'Govt',
    checkup.remarks = 'Synthetic demo referral: hospital evaluation recommended.'
WHERE mother.mother_code = 'DEMO-M-0003'
  AND checkup.trimester = '1st Trimester'
  AND checkup.checkup_number = 2;

UPDATE mother_checkups checkup
INNER JOIN mothers mother ON mother.id = checkup.mother_id
SET checkup.referred_to_hospital = 1,
    checkup.lab_assistance_provided = 1,
    checkup.assistance_amount = 1200.00,
    checkup.source_of_funds = 'Demo Municipal Health Fund',
    checkup.facility_type = 'Govt',
    checkup.remarks = 'Synthetic demo referral: follow-up referral with lab assistance.'
WHERE mother.mother_code = 'DEMO-M-0003'
  AND checkup.trimester = '2nd Trimester'
  AND checkup.checkup_number = 1;

INSERT INTO children (
  child_code, mother_id, community_id, group_id, batch_id,
  first_name, middle_name, last_name, birth_date, birth_weight, birth_length,
  gender, delivery_type, health_status, birth_place, birth_attendant, apgar_score,
  feeding_type, nutrition_notes, father_name, relationship, address, progress
)
SELECT seed.child_code, m.id, m.community_id, m.group_id, m.batch_id,
       seed.first_name, NULL, m.last_name, seed.birth_date, seed.birth_weight, seed.birth_length,
       seed.gender, 'Normal vaginal delivery', 'Active', 'Community Health Center',
       'Demo Health Worker', '9/10', seed.feeding_type, seed.nutrition_notes,
       'Demo Parent', 'Father', m.address, seed.progress
FROM (
  SELECT 'DEMO-C-0001' AS child_code, 'Ari' AS first_name, 'DEMO-M-0001' AS mother_code,
         '2026-02-09' AS birth_date, 3.20 AS birth_weight, 50.00 AS birth_length,
         'Male' AS gender, 'Breastfeed' AS feeding_type, 'Synthetic partial monitoring demo.' AS nutrition_notes, 25 AS progress
  UNION ALL SELECT 'DEMO-C-0002', 'Noa', 'DEMO-M-0002', '2024-10-09', 3.35, 50.50, 'Female', 'Breastfeed', 'Synthetic complete monitoring demo.', 100
  UNION ALL SELECT 'DEMO-C-0003', 'Eli', 'DEMO-M-0003', '2025-10-09', 3.10, 49.50, 'Male', 'Bottle feed', 'Synthetic in-progress monitoring demo.', 50
  UNION ALL SELECT 'DEMO-C-0004', 'Mia', 'DEMO-M-0004', '2026-05-09', 3.00, 49.00, 'Female', 'Breastfeed', 'Synthetic monitoring not-yet-started demo.', 0
) AS seed
INNER JOIN mothers m ON m.mother_code = seed.mother_code
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
  delivery_type = VALUES(delivery_type),
  health_status = VALUES(health_status),
  birth_place = VALUES(birth_place),
  birth_attendant = VALUES(birth_attendant),
  apgar_score = VALUES(apgar_score),
  feeding_type = VALUES(feeding_type),
  nutrition_notes = VALUES(nutrition_notes),
  father_name = VALUES(father_name),
  relationship = VALUES(relationship),
  address = VALUES(address),
  progress = VALUES(progress);

DELETE checkup
FROM child_checkups AS checkup
INNER JOIN children AS child ON child.id = checkup.child_id
WHERE child.child_code IN ('DEMO-C-0001', 'DEMO-C-0002', 'DEMO-C-0003')
  AND checkup.notes LIKE 'Synthetic demo growth check-up for month %';

INSERT INTO child_checkups (
  child_id, week_number, visit_date, next_checkup_date, weight, height,
  head_circumference, developmental_status, service_provider, notes
)
WITH RECURSIVE visit_months (month_number) AS (
  SELECT 1
  UNION ALL
  SELECT month_number + 1 FROM visit_months WHERE month_number < 24
)
SELECT c.id,
       visit_months.month_number,
       DATE_ADD(c.birth_date, INTERVAL visit_months.month_number MONTH),
       DATE_ADD(c.birth_date, INTERVAL (visit_months.month_number + 1) MONTH),
       ROUND(c.birth_weight + (visit_months.month_number * 0.34), 2),
       ROUND(c.birth_length + (visit_months.month_number * 1.15), 1),
       ROUND(34 + (visit_months.month_number * 0.35), 1),
       CASE WHEN visit_months.month_number IN (9, 18) THEN 'Needs Follow-up' ELSE 'Normal' END,
       'Demo Health Worker',
       CONCAT('Synthetic demo growth check-up for month ', visit_months.month_number, '.')
FROM children c
INNER JOIN (
  SELECT 'DEMO-C-0001' AS child_code, 6 AS visit_count
  UNION ALL SELECT 'DEMO-C-0002', 24
  UNION ALL SELECT 'DEMO-C-0003', 12
) AS seed ON seed.child_code = c.child_code
INNER JOIN visit_months ON visit_months.month_number <= seed.visit_count;

INSERT INTO programs (
  name, type, provider, description, beneficiary_type, status,
  target, received, activities, latest
)
SELECT 'Demo Maternal Referral Support', 'Health Support', 'Demo Municipal Health Office',
       'Synthetic program data for Progress Report and program monitoring demonstrations.',
       'Mother', 'Active', 4, 3, 7, '2026-10-07'
WHERE NOT EXISTS (
  SELECT 1 FROM programs WHERE name = 'Demo Maternal Referral Support'
);

INSERT INTO programs (
  name, type, provider, description, beneficiary_type, status,
  target, received, activities, latest
)
SELECT 'Demo Child Nutrition Support', 'Nutrition Support', 'Demo Municipal Health Office',
       'Synthetic program data for child benefit monitoring demonstrations.',
       'Child', 'Active', 4, 3, 5, '2026-10-06'
WHERE NOT EXISTS (
  SELECT 1 FROM programs WHERE name = 'Demo Child Nutrition Support'
);

SET @demo_maternal_program_id = (
  SELECT id FROM programs WHERE name = 'Demo Maternal Referral Support' ORDER BY id LIMIT 1
);
SET @demo_child_program_id = (
  SELECT id FROM programs WHERE name = 'Demo Child Nutrition Support' ORDER BY id LIMIT 1
);
SET @demo_school_name = (
  SELECT name FROM communities WHERE id = @demo_community_id LIMIT 1
);

INSERT INTO program_clusters (
  program_id, scope_type, scope_name, beneficiaries, received
) VALUES
  (@demo_maternal_program_id, 'School', @demo_school_name, 4, 3),
  (@demo_child_program_id, 'School', @demo_school_name, 4, 3)
ON DUPLICATE KEY UPDATE
  beneficiaries = VALUES(beneficiaries),
  received = VALUES(received);

INSERT INTO monitoring_logs (
  beneficiary_id, beneficiary_type, program_id, monitored,
  monitored_date, monitored_by, notes
)
SELECT CAST(mother.id AS CHAR), 'mother', @demo_maternal_program_id, 1,
       seed.monitored_date, NULL, seed.notes
FROM (
  SELECT 'DEMO-M-0001' AS mother_code, '2026-09-16' AS monitored_date, 'Synthetic demo maternal support receipt.' AS notes
  UNION ALL SELECT 'DEMO-M-0001', '2026-10-07', 'Synthetic demo maternal support follow-up.'
  UNION ALL SELECT 'DEMO-M-0002', '2026-08-11', 'Synthetic demo maternal referral support.'
  UNION ALL SELECT 'DEMO-M-0002', '2026-09-08', 'Synthetic demo maternal support receipt.'
  UNION ALL SELECT 'DEMO-M-0002', '2026-10-06', 'Synthetic demo maternal support follow-up.'
  UNION ALL SELECT 'DEMO-M-0003', '2026-08-26', 'Synthetic demo maternal referral support.'
  UNION ALL SELECT 'DEMO-M-0003', '2026-10-07', 'Synthetic demo maternal support follow-up.'
) AS seed
INNER JOIN mothers mother ON mother.mother_code = seed.mother_code
ON DUPLICATE KEY UPDATE
  monitored = VALUES(monitored),
  notes = VALUES(notes);

INSERT INTO monitoring_logs (
  beneficiary_id, beneficiary_type, program_id, monitored,
  monitored_date, monitored_by, notes
)
SELECT CAST(child.id AS CHAR), 'child', @demo_child_program_id, 1,
       seed.monitored_date, NULL, seed.notes
FROM (
  SELECT 'DEMO-C-0001' AS child_code, '2026-09-09' AS monitored_date, 'Synthetic demo child nutrition support.' AS notes
  UNION ALL SELECT 'DEMO-C-0001', '2026-10-09', 'Synthetic demo child nutrition follow-up.'
  UNION ALL SELECT 'DEMO-C-0002', '2026-09-09', 'Synthetic demo child nutrition support.'
  UNION ALL SELECT 'DEMO-C-0002', '2026-10-09', 'Synthetic demo child nutrition follow-up.'
  UNION ALL SELECT 'DEMO-C-0003', '2026-10-09', 'Synthetic demo child nutrition support.'
) AS seed
INNER JOIN children child ON child.child_code = seed.child_code
ON DUPLICATE KEY UPDATE
  monitored = VALUES(monitored),
  notes = VALUES(notes);

COMMIT;
