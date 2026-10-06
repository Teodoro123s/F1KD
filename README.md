# React App Framework

F1KD beneficiary monitoring and reporting app.

## Repository layout

- `frontend/` contains the React/Vite app, its dependencies, and its Nginx production image configuration.
- `server/` contains the Express API, its dependencies, and backend tests.
- The root contains Docker Compose configuration and the deployment `.env` file.

The WHO growth calculator and reference data are bundled separately in each app so both Docker images can build from their own context; keep those copies in sync when updating the standards.

## Docker: Full Stack

Docker Compose runs a MySQL-compatible MariaDB database, MinIO document storage, the Express API, and the built React app. This does not require a MySQL installation on the Docker host.

1. Install Docker Desktop (Windows/macOS) or Docker Engine with the Compose plugin (Linux).
2. Copy `.env.docker.example` to `.env` and replace every password/secret placeholder with unique values.
3. Start the services from the repository root:

```sh
docker compose -f docker-compose.minio.yml up --build -d
```

Open `http://localhost:8080` on the Docker host. Other devices on the same network can open `http://<docker-host-LAN-IP>:8080`; allow that port through the host firewall. The database and API are not published directly to the network. The MinIO console is bound to the host only at `http://localhost:9001`.

Data persists in the `mariadb-data` and `minio-data` Docker volumes. Local-upload fallback files persist under `server/data/uploads`. `docker compose down` keeps this data; `docker compose down -v` deletes the database and MinIO volumes and should not be used unless you intend to erase them. Back up the SQL database and MinIO objects before moving to a different Docker host; volumes are local to the host and are not automatically synchronized to client devices.

An existing local MySQL/MariaDB database is not copied automatically. Export it with `mysqldump`, start the stack, then import the dump into the `mariadb` service before using the app. Copy existing local document files into MinIO or `server/data/uploads` as appropriate; changing the database host alone does not migrate documents.

To stop without deleting stored data:

```sh
docker compose -f docker-compose.minio.yml down
```

## Local Development

The frontend and backend are separate Node projects. Run each in its own terminal from the repository root.

### Frontend (React + Vite)

```bash
cd frontend
npm ci
npm run dev
```

The Vite development server proxies `/api` requests to `http://localhost:4000`. Build and preview the frontend with:

```bash
npm run build
npm run preview
```

Run frontend tests from `frontend/` with `npm test`.

### Backend (Express + MySQL/MariaDB)

Run the backend from a separate terminal:

```bash
cd server
npm ci
cp .env.example .env
# edit .env to set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
npm run dev
```

Run backend tests from `server/` with `npm test`.
