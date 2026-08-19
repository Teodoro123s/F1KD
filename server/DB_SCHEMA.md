# F1KD Database Schema

This document describes the MySQL database used by the F1KD backend.

## Connection

The backend reads these values from `server/.env`:

| Setting | Current value |
|---|---|
| Database | `f1kd` |
| Host | `localhost` |
| Port | `3306` unless `DB_PORT` is set |
| User | `root` unless `DB_USER` is set |

The connection settings are defined in [server/db.js](db.js). The backend runs the `CREATE TABLE IF NOT EXISTS` statements in that file during startup. These statements create missing tables, but they do not automatically change the structure of an existing table.

## Live Table Inventory

The following row counts were read from the live `f1kd` database on 2026-08-19.

| Table | Rows | Current assessment |
|---|---:|---|
| `users` | 7 | Active: authentication and user management |
| `communities` | 7 | Active: community management |
| `batches` | 3 | Active: community batch management |
| `groups` | 6 | Active: community group management |
| `group_batch` | 0 | Supporting many-to-many relationship; not currently populated |
| `mothers` | 5 | Active: sample mother records |
| `children` | 4 | Active: child records |
| `mother_ob_history` | 0 | Planned/supporting clinical data |
| `mother_medical_condition` | 0 | Legacy singular table; not referenced by current code |
| `mother_medical_conditions` | 0 | Supporting clinical data; not currently used by routes |
| `mother_dental_records` | 0 | Supporting clinical data; not currently used by routes |
| `mother_vaccinations` | 0 | Supporting clinical data; not currently used by routes |
| `mother_vaccines` | 0 | Legacy alternate table; not referenced by current code |
| `child_medical_conditions` | 0 | Supporting clinical data; not currently used by routes |
| `child_vaccinations` | 0 | Supporting clinical data; not currently used by routes |
| `child_vaccines` | 0 | Legacy alternate table; not referenced by current code |
| `child_checkups` | 0 | Supporting clinical data; not currently used by routes |

## Core Tables

### `users`

Stores application users and access-control information.

- Primary key: `id`
- Identity fields: `first_name`, `middle_initial`, `last_name`, `email`
- Account fields: `role`, `status`, `password_hash`
- Profile fields: `contact_number`, `gender`, `dob`, `location`
- Used by authentication and user-management routes

### `communities`

Stores communities used to organize beneficiary records.

- Primary key: `id`
- Unique identifier: `community_code`
- Main fields: `name`, `area`

### `batches`

Stores beneficiary batches belonging to a community.

- Primary key: `id`
- Unique identifier: `batch_code`
- Foreign key: `community_id` -> `communities.id`
- Delete behavior: deleting a community cascades to its batches

### `groups`

Stores beneficiary groups belonging to a community.

- Primary key: `id`
- Unique identifier: `group_code`
- Foreign key: `community_id` -> `communities.id`
- Delete behavior: deleting a community cascades to its groups

### `group_batch`

Join table for assigning batches to groups.

- Composite primary key: `group_id`, `batch_id`
- Foreign keys: `group_id` -> `groups.id`, `batch_id` -> `batches.id`
- Delete behavior: deleting either parent removes the assignment

### `mothers`

Stores mother/beneficiary profiles and pregnancy-monitoring fields.

- Primary key: `id`
- Unique identifier: `mother_code`
- Optional external identifier: `mother_external_id`
- Current relationship fields: `community` and `area` are stored as text; `group_id` and `batch_id` store the related numeric IDs
- The live table does not contain `community_id`, `mother_id_no`, or a `status` column
- Delete behavior for group and batch relationships is managed by the current application schema; verify foreign keys before changing them
- Related clinical tables use `mother_id`

### `children`

Stores child profiles linked to mothers.

- Primary key: `id`
- Unique identifier: `child_code`
- Required foreign key: `mother_id` -> `mothers.id`
- Optional foreign keys: `community_id` -> `communities.id`, `batch_id` -> `batches.id`
- Delete behavior: deleting a mother cascades to children; deleting a community or batch sets the corresponding field to `NULL`
- Related clinical tables use `child_id`

## Clinical Tables

These tables are part of the intended normalized data model. They currently exist in the live database but have no application routes that read or write them.

### Mother-related tables

- `mother_ob_history`: obstetric history linked by `mother_id`
- `mother_medical_conditions`: medical conditions linked by `mother_id`
- `mother_dental_records`: dental records linked by `mother_id`
- `mother_vaccinations`: vaccinations using `vaccine_name`, `vaccine_date`, and `remarks`, linked by `mother_id`

### Child-related tables

- `child_medical_conditions`: medical conditions linked by `child_id`
- `child_vaccinations`: vaccinations using `vaccine_name`, `vaccine_date`, and `remarks`, linked by `child_id`
- `child_checkups`: growth/checkup records linked by `child_id`

## Legacy and Duplicate Tables

The following tables are empty in the current database and are not referenced by active backend code:

### `mother_medical_condition`

This is a singular alternate of `mother_medical_conditions`. It has different columns, including `notes` and `created_at`, so it should not be treated as a transparent rename.

### `mother_vaccines`

This is an alternate of `mother_vaccinations`. It uses `vaccine_code` and `date_given` instead of `vaccine_name` and `vaccine_date`.

### `child_vaccines`

This is an alternate of `child_vaccinations` with the same naming difference: `vaccine_code` and `date_given` instead of `vaccine_name` and `vaccine_date`.

Do not drop these tables solely because they are empty. Before cleanup, confirm that no external scripts, reports, manual queries, or future migration depends on them, and take a database backup.

## Application References

- Database creation and relationships: [server/db.js](db.js)
- Authentication: [server/routes/auth.js](routes/auth.js)
- User management: [server/routes/users.js](routes/users.js)
- Community, batch, and group operations: [server/routes/community.js](routes/community.js)
- Mother operations: [server/routes/mothers.js](routes/mothers.js)
- Child operations: [server/routes/children.js](routes/children.js)
- Archived or alternate schema proposals: [server/migrations/archive](migrations/archive)

## Known Schema Drift

There are older schema definitions in `server/migrations/archive` and `server/migrations/compiled_schema.sql`. They contain alternate column names and table definitions, including older `users`, `mothers`, and `children` models. They should be treated as historical reference, not as the authoritative live schema.

The authoritative runtime schema is the one in [server/db.js](db.js), together with any additional columns already present in the live database. `CREATE TABLE IF NOT EXISTS` does not remove old tables or reconcile conflicting columns.

## Maintenance Guidance

1. Back up the database before deleting tables or changing columns.
2. Use `SHOW TABLES` and `SHOW CREATE TABLE table_name` to verify the live database before applying cleanup.
3. Keep only one canonical table for each data concept when the clinical features are implemented.
4. Add routes and tests before writing clinical data to the currently unused clinical tables.
5. Update this document whenever the live schema changes.

