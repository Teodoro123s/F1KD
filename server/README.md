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

Create and update endpoints enforce uniqueness on the server; clients should
display the returned `409 Conflict` error and must not retry with altered key
values. Comparisons ignore surrounding whitespace and letter case.

| Record | Uniqueness key |
| --- | --- |
| User | Email address and contact number (checked independently) |
| Mother beneficiary | First, middle, and last name + date of birth + community; external/government identifier |
| Child beneficiary | First, middle, and last name + date of birth + mother |
| Community | Name |
| Group | Community + name |
| Batch | Community + name |
| Program | Name + type |

Update checks exclude the record being edited, so unchanged keys remain valid.
Database unique keys on identifiers and generated codes remain an additional
integrity safeguard.

Available endpoints:
- `GET /api/health` — health check
- `GET /api/users` — list users
- `POST /api/users` — create user `{ "name": "...", "email": "..." }`

The server will create a simple `users` table on first run if it doesn't exist.
