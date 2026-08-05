# React App Framework

Starter React app scaffolded with Vite.

## Quick start

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Backend (Express + MySQL)

A minimal Node/Express backend lives in the `server` folder and provides a small users API.

Quick setup:

```bash
cd server
npm install
cp .env.example .env
# edit .env to set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
npm run dev
```

Endpoints:
- `GET /api/health` — health check
- `GET /api/users` — list users
- `POST /api/users` — create user `{ "name": "...", "email": "..." }`

The backend uses `mysql2` and will ensure a simple `users` table exists on startup.
