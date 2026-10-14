# React App Framework

F1KD beneficiary monitoring and reporting app.

## Docker: Full Stack

Docker Compose runs a MySQL-compatible MariaDB database, MinIO document storage, the Express API, and the built React app. This does not require a MySQL installation on the Docker host.

1. Install Docker Desktop (Windows/macOS) or Docker Engine with the Compose plugin (Linux).
2. Copy `.env.docker.example` to `.env` and replace every password/secret placeholder with unique values.
3. Add the EmailJS service ID, public key, private key, credentials template ID (named `EMAILJS_CREDENTIALS_TEMPLATE_ID` or `EMAILJS_USER_TEMPLATE_ID`), and OTP template ID to `.env` to enable account emails and password resets. Rotate any private key exposed in screenshots before configuring it. Keep the private key server-side; never use a `VITE_*` variable for it. The credentials template needs an email recipient field (`email` or `to_email`), `to_name`, `role`, and `password`; the OTP template needs an email recipient field (`email` or `to_email`), `to_name`, `passcode`, and `time`.
4. Start the services from the repository root:

```sh
docker compose -f docker-compose.minio.yml up --build -d
```

Open `http://localhost:8080` on the Docker host. Other devices on the same network can open `http://<docker-host-LAN-IP>:8080`; allow that port through the host firewall. The database and API are not published directly to the network. The MinIO console is bound to the host only at `http://localhost:9001`.

Data persists in the `mariadb-data` and `minio-data` Docker volumes. Local-upload fallback files persist under `server/data/uploads`. `docker compose down` keeps this data; `docker compose down -v` deletes the database and MinIO volumes and should not be used unless you intend to erase them. Back up the SQL database and MinIO objects before moving to a different Docker host; volumes are local to the host and are not automatically synchronized to client devices.

An existing local MySQL/MariaDB database is not copied automatically. Export it with `mysqldump`, start the stack, then import the dump into the `mariadb` service before using the app. Copy existing local document files into MinIO or `server/data/uploads` as appropriate; changing the database host alone does not migrate documents.

For local testing only, role shortcuts can be explicitly enabled while keeping the web port bound to loopback:

```powershell
$env:ENABLE_TEST_ROLE_SHORTCUTS = "true"
$env:WEB_PORT = "127.0.0.1:8080"
docker compose -f docker-compose.minio.yml up --build -d
Remove-Item Env:ENABLE_TEST_ROLE_SHORTCUTS
Remove-Item Env:WEB_PORT
```

For the local Express API, copy `server/.env.example` to `server/.env` and set the same five EmailJS variables there.

The shortcuts sign in to the first existing active account for the selected role. Do not enable them in a publicly accessible deployment.

To stop without deleting stored data:

```sh
docker compose -f docker-compose.minio.yml down
```

## Local Development

## Quick start

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

For local role testing, start the backend with `NODE_ENV=development` to enable the login shortcuts for loopback requests. In Docker, use the explicit opt-in above; normal email/password login remains available.

Build for production:

```bash
npm run build
npm run preview
```

## Backend (Express + MySQL/MariaDB)

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
