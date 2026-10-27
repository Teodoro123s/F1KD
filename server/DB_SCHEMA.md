# F1KD Database Schema Review

This is the unified review of the database structure defined by the current schema scripts and the live verification of the `users` table.

The interface calls the operational module **Projects**. This schema intentionally retains the legacy `programs` table and related identifiers; no database rename is performed.

## 1. Source of truth

The current schema is represented by:

- [server/create_users.sql](create_users.sql)
- [server/f1kd_recreate.sql](f1kd_recreate.sql)
- [server/db.js](db.js)

The live database was also checked directly with MySQL, and the current `users` table contains the following columns:

- `id`
- `first_name`
- `last_name`
- `middle_initial`
- `contact_number`
- `email`
- `gender`
- `dob`
- `location`
- `role`
- `status`
- `password_hash`
- `consent_accepted_at`
- `name`
- `created_at`
- `updated_at`
- `school_id`
- `group_id`
- `coordinator_school_id` (generated; populated only for Community Coordinator roles)

Coordinator assignments are kept in sync with `communities.coordinator_id`. A coordinator can be linked to only one school, and a school can have only one coordinator. `uq_users_coordinator_school_id` and `uq_communities_coordinator_id` enforce those limits.
Transfers and replacements are not implicit: first explicitly unassign the coordinator in the school editor and save, then assign an available coordinator. Conflicting attempts return HTTP 409 without changing either assignment.

This means the active app is aligned with the leaner user model and not with older legacy field names like `username`, `full_name`, or `middle_name` as stored table columns.

---

## 2. Unified table inventory

### users

Primary application account table.

Columns:
- `id`
- `first_name`
- `last_name`
- `middle_initial`
- `contact_number`
- `email`
- `gender`
- `dob`
- `location`
- `role`
- `status`
- `password_hash`
- `consent_accepted_at`
- `name` (generated column)
- `created_at`
- `updated_at`
- `school_id`
- `group_id`

Purpose:
- authentication
- recording required user consent before allowing access to protected modules
- authorization
- assignment-based scoping
- admin and partner user management

---

### communities

Columns:
- `id`
- `community_code`
- `name`
- `area`
- `coordinator_id`
- `created_at`

Purpose:
- school/community structure used for beneficiary and operational assignment

---

### groups

Columns:
- `id`
- `group_code`
- `community_id`
- `name`
- `leader`
- `members_count`
- `status`
- `created_at`

Purpose:
- operational group assignment within a community
- used for health worker and partner scoping

---

### batches

Columns:
- `id`
- `batch_code`
- `community_id`
- `name`
- `records`
- `progress`
- `status`
- `created_at`

Purpose:
- cohort/batch grouping for service delivery and reporting

---

### group_batch

Columns:
- `group_id`
- `batch_id`

Purpose:
- many-to-many relationship between groups and batches

### batch_documentation_sets

Columns:
- `id`
- `batch_id`
- `evidence_date`
- `uploaded_by_user_id`
- `created_at`

Purpose:
- groups all photos uploaded together for one dated batch documentation entry

### batch_documentations

Columns:
- `id`
- `batch_id`
- `evidence_date`
- `file_name`
- `file_path`
- `uploaded_by_user_id`
- `documentation_set_id` (nullable for legacy single-photo entries)
- `created_at`

Purpose:
- stores photos attached to a dated batch documentation entry
- new entries contain at least three photos linked to a documentation set
- evidence files are stored using the configured document storage, and rows are removed with their batch

---

### mothers

Columns:
- `id`
- `mother_code`
- `community_id`
- `group_id`
- `batch_id`
- `first_name`
- `middle_name`
- `last_name`
- `maiden_surname`
- `suffix`
- `mother_id_no`
- `mother_external_id`
- `dob`
- `birth_place`
- `allergies`
- `blood_type`
- `civil_status`
- `employment_status`
- `educational_attainment`
- `data_privacy_signed`
- `media_release_signed`
- `lmp_date`
- `edd_date`
- `contact_number`
- `is_high_risk`
- `program_type`
- `emergency_name`
- `emergency_contact`
- `emergency_relationship`
- `spouse_name`
- `address`
- `prenatal_reg_date`
- `trimester`
- `gestational_age`
- `prenatal_weight`
- `prenatal_bp`
- `prenatal_height`
- `fundal_height`
- `fhr`
- `gravida`
- `para`
- `abortion`
- `stillbirth`
- `total_children`
- `children_born_alive`
- `miscarriages`
- `children_died_after_birth`
- `weight`
- `height`
- `medical_conditions`
- `other_medical_history`
- `status`
- `visits`
- `progress`
- `birth_certificate_document_name`
- `birth_certificate_document_path`
- `consent_document_name`
- `consent_document_path`
- `created_at`

Purpose:
- maternal profile and pregnancy monitoring records

---

### mother_ob_history

Columns:
- `id`
- `mother_id`
- `event_label`
- `event_code`
- `gestational_age`
- `outcome`
- `seq`
- `created_at`

Purpose:
- obstetric history tracking for each mother

---

### mother_medical_conditions

Columns:
- `id`
- `mother_id`
- `visit_date`
- `condition_name`
- `has_condition`

Purpose:
- maternal clinical condition tracking

---

### mother_dental_records

Columns:
- `id`
- `mother_id`
- `dental_facility`
- `dentist_in_charge`
- `community_dentist`
- `dentist_license`
- `dentist_contact`
- `teeth_count`
- `dental_findings`
- `dental_remarks`
- `tartar_removal`
- `filling`
- `cleaning`
- `extraction`
- `root_canal`
- `other_procedure`

Purpose:
- dental screening and treatment records

---

### mother_vaccinations

Columns:
- `id`
- `mother_id`
- `vaccine_name`
- `vaccine_date`
- `remarks`

Purpose:
- maternal immunization history

---

### mother_checkups

Columns:
- `id`
- `mother_id`
- `trimester`
- `checkup_number`
- `checkup_date`
- `gestational_age_weeks`
- `blood_pressure`
- `weight_kg`
- `height_cm`
- `bmi`
- `nutritional_status`
- `fundal_height_cm`
- `fetal_heart_rate_bpm`
- `service_provider`
- `next_checkup_date`
- `referred_to_hospital`
- `lab_assistance_provided`
- `assistance_amount`
- `source_of_funds`
- `facility_type`
- `milk_subsidy_date`
- `milk_quantity_pcs`
- `milk_subsidy_provided`
- `lab_assistance_tests`
- `laboratory_requests`
- `treatment_services`
- `remarks`
- `recorded_by_user_id`
- `created_by_user_id`
- `updated_by_user_id`
- `created_at`
- `updated_at`

Purpose:
- maternal prenatal monitoring and service tracking across trimester check-ups
- laboratory requests, assistance, milk subsidy, and treatment/service notes from the maternal record
- authenticated users who created and last updated the check-up, with timestamps

---

### children

Columns:
- `id`
- `child_code`
- `mother_id`
- `community_id`
- `group_id`
- `batch_id`
- `first_name`
- `middle_name`
- `last_name`
- `suffix`
- `birth_date`
- `birth_weight`
- `birth_length`
- `head_circumference`
- `chest_circumference`
- `gender`
- `blood_type`
- `no_of_child_delivered`
- `multiple_birth_type`
- `exclusive_breastfeeding`
- `expanded_newborn_screening`
- `expanded_newborn_screening_result`
- `delivery_type`
- `health_status`
- `birth_place`
- `birth_attendant`
- `apgar_score`
- `feeding_type`
- `nutrition_notes`
- `father_name`
- `relationship`
- `address`
- `progress`
- `birth_document_name`
- `birth_document_path`
- `created_at`

Purpose:
- child profile and growth tracking linked to mother record

---

### child_medical_conditions

Columns:
- `id`
- `child_id`
- `condition_name`
- `has_condition`

Purpose:
- child medical condition tracking

---

### child_vaccinations

Columns:
- `id`
- `child_id`
- `vaccine_name`
- `dose_number` (1-3; existing records default to 1)
- `vaccine_date`
- `remarks`

Purpose:
- child immunization tracking

---

### child_checkups

Columns:
- `id`
- `child_id`
- `week_number`
- `next_checkup_date`
- `visit_date`
- `weight`
- `height`
- `head_circumference`
- `exclusive_breastfeeding`
- `laboratory_requests`
- `laboratory_assistance_provided`
- `referred_to_hospital`
- `assistance_amount`
- `source_of_funds`
- `facility_type`
- `developmental_status`
- `service_provider`
- `notes`
- `recorded_by_user_id`
- `created_by_user_id`
- `updated_by_user_id`
- `created_at`
- `updated_at`

Purpose:
- pediatric growth monitoring with monthly follow-ups through 24 months
- per-visit feeding method, laboratory, referral, and assistance records
- `exclusive_breastfeeding` stores the feeding-method choice (`VARCHAR(40)`): Exclusive breastfeeding, Bottle feeding, Formula feeding, Mixed feeding, or Complementary feeding
- authenticated users who created and last updated the check-up, with timestamps
- supplementary feeding is intentionally excluded here; it remains part of Program records

---

### roles

Columns:
- `id`
- `role_key`
- `role_name`

Purpose:
- catalog of roles for RBAC setup

---

### permissions

Columns:
- `id`
- `resource_key`
- `action_key`

Purpose:
- permission catalog for resources and actions

---

### role_permissions

Columns:
- `id`
- `role_id`
- `permission_id`

Purpose:
- join table linking roles to permissions

---

### programs

Columns:
- `id`
- `name`
- `type`
- `provider`
- `description`
- `beneficiary_type`
- `status`
- `target`
- `received`
- `activities`
- `latest`
- `ended`
- `created_at`
- `updated_at`

Purpose:
- program records and operational delivery tracking

---

### program_clusters

Columns:
- `id`
- `program_id`
- `scope_type`
- `scope_name`
- `beneficiaries`
- `received`
- `created_at`

Purpose:
- program targets by scope such as community/group/batch

---

### monitoring_logs

Columns:
- `id`
- `beneficiary_id`
- `beneficiary_type`
- `program_id`
- `monitored`
- `monitored_date`
- `monitored_by`
- `created_by_user_id`
- `updated_by_user_id`
- `notes`
- `created_at`
- `updated_at`

Purpose:
- monitoring and follow-up log for program participation
- preserves the creator and latest updater for each receipt

### program_receipt_documentation_sets

Stores one dated photo evidence set uploaded for a program check-in submission. A set can be linked to multiple monitoring logs when one submission covers several beneficiaries.

### program_receipt_documentations

Stores the individual photo files attached to a program receipt documentation set.

### program_receipt_documentation_logs

Links a shared program receipt documentation set to each beneficiary receipt/check-in covered by that submission.

---

## 3. Database review findings

### Active and aligned fields

The current active core schema is clean and consistent for the application’s operational use:

- user identity and credentials: `first_name`, `last_name`, `middle_initial`, `email`, `password_hash`
- user assignment: `school_id`, `group_id`
- user status: `role`, `status`
- profile metadata: `gender`, `dob`, `location`, `contact_number`

### Legacy fields to treat carefully

Older scripts and migration drafts mention legacy fields such as:

- `username`
- `full_name`
- `middle_name` on `users`

These are not part of the active live `users` table and should not be treated as current storage columns unless they are reintroduced intentionally.

### Recommendation

1. Keep the current `users` structure as the canonical user model.
2. Treat `create_users.sql` and `f1kd_recreate.sql` as the authoritative schema definitions for the next cleanup or rebuild.
3. Before dropping any older fields, verify whether they are only produced from SQL aliases or truly stored in a different table.
4. Back up the database before any destructive cleanup.

---

## 4. Final assessment

The database is generally organized around a clear separation of concerns:

- `users` for auth and permissions
- `communities`, `groups`, `batches` for hierarchy and assignment
- `mothers` and `children` for beneficiary records
- clinical support tables for conditions, vaccines, dental history, and checkups
- `roles`, `permissions`, and `role_permissions` for RBAC scaffolding
- `programs`, `program_clusters`, and `monitoring_logs` for program tracking and monitoring

This is the cleanest single review summary of the database schema as it exists in the current project files and the live verification of the `users` table.

## 5. Notification read receipts

`notification_reads` stores a per-user receipt for each notification opened from the Notifications page. Its composite primary key (`notification_id`, `user_id`) ensures each user has an independent read state, and deleting a notification cascades to its receipts. The Notifications API uses this table to provide accurate All, Read, and Unread counts and filters.

The table is created during database initialization in `db.js` and is also defined in `migrations/20261016_create_notification_reads.sql`.

## 6. Notification category preferences

`notification_preferences` stores each user's enabled/hidden state for supported notification categories. Disabled categories are excluded from that user's timeline, unread counts, and read-state actions, while the original notification rows remain available if the category is enabled again. The category and user form the composite primary key.

The table is created during database initialization in `db.js` and is also defined in `migrations/20261019_notification_preferences.sql`.
