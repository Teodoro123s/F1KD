# Database Schema Documentation

This project currently uses a single MySQL table created by `server/db.js`.

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
