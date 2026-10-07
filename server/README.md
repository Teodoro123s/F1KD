# Backend (Express + MySQL)

Quick setup:

```bash
cd server
npm ci
cp .env.example .env
# edit .env to set DB_* variables
npm run dev
```

Run the backend test suite with `npm test`.

## Duplicate record policy

Create and identity-changing update endpoints enforce uniqueness on the server.
Comparisons ignore surrounding whitespace and letter case. Duplicate records
return `409 Conflict`; uniqueness-lock timeouts return `503 Service Unavailable`
and may be retried without changing the submitted values.

| Record | Uniqueness key |
| --- | --- |
| User | Email address, full name, and contact number (checked independently) |
| Beneficiary (mother or child) | Full name, checked globally across both beneficiary types |
| Mother beneficiary | External/government identifier |
| Community | Name |
| Group | Community + name |
| Batch | Community + name |
| Program | Name + type |

Beneficiary full names include each record's stored name parts (including a
mother's maiden surname and suffix, or a child's suffix); date of birth,
community, and mother-child relationship do not scope the full-name check.
Update checks exclude the record being edited, so unchanged identity keys are
not rejected. Existing data is not automatically merged or deleted.

Available endpoints:
- `GET /api/health` — health check
- `GET /api/users` — list users
- `POST /api/users` — create user `{ "name": "...", "email": "..." }`

The server will create a simple `users` table on first run if it doesn't exist.
