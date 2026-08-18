# Database Schema Documentation

This project creates and migrates several MySQL tables on server startup (via `server/db.js`). The schema covers users, communities, batches, groups, mothers and related clinical tables. New child tables were added to support child profiles, vaccinations and checkups.

## Table: `users`

| Column      | Type           | Null | Key      | Default              | Extra                | Description |
|-------------|----------------|------|----------|----------------------|----------------------|-------------|
| `id`        | `INT`          | NO   | `PRIMARY`| `AUTO_INCREMENT`     |                      | Primary key |
| `name`      | `VARCHAR(255)` | NO   |          |                      |                      | User name   |
| `email`     | `VARCHAR(255)` | YES  | `UNIQUE` |                      |                      | User email address |
| `created_at`| `TIMESTAMP`    | YES  |          | `CURRENT_TIMESTAMP`  |                      | Record creation timestamp |

### Notes

- The table is created automatically on server startup if it does not already exist.
- API endpoints that interact with this table are defined in `server/routes/users.js`.
- Supported operations:
  - `GET /api/users` — list users
  - `POST /api/users` — create a user

### Example POST body

```json
{
  "name": "Alice Example",
  "email": "alice@example.com"
}
```

## Children and child-related tables

The following new tables support child profiles, medical conditions, vaccinations, and checkups. They are created automatically on server startup by `server/db.js`.

- `children` — child profiles linked to a mother
  - Columns: id, child_code, mother_id (FK -> mothers.id), community_id, batch_id, first_name, middle_name, last_name, suffix, birth_date, birth_weight, birth_length, gender, delivery_type, health_status, birth_place, birth_attendant, apgar_score, feeding_type, nutrition_notes, progress, created_at

- `child_medical_conditions` — normalized list of medical conditions for a child
  - Columns: id, child_id (FK -> children.id), condition_name, has_condition

- `child_vaccinations` — vaccination records for children
  - Columns: id, child_id (FK -> children.id), vaccine_name, vaccine_date, remarks

- `child_checkups` — child growth and visit records
  - Columns: id, child_id (FK -> children.id), visit_date, weight, height, head_circumference, notes, created_at

Notes:
- These tables are normalized and use foreign key constraints. Deleting a mother will cascade-delete her children and associated child records.
- For quick in-memory/demo workflows the frontend currently adds child objects into the in-memory mothers list; for persistence across sessions use the API endpoints that will map to these tables (can be added on request).

