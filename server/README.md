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

Available endpoints:
- `GET /api/health` — health check
- `GET /api/users` — list users
- `POST /api/users` — create user `{ "name": "...", "email": "..." }`

The server will create a simple `users` table on first run if it doesn't exist.
