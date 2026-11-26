# F1KD

F1KD beneficiary monitoring and reporting app.

## Philippine location data

The beneficiary address pickers use [`@aivangogh/ph-address`](https://www.npmjs.com/package/@aivangogh/ph-address), based on the Philippine Statistics Authority (PSA) PSGC snapshot as of June 30, 2026. It supplies 82 provinces and 42,010 barangays; NCR, the BARMM Special Geographic Area, and Isabela City are also available in the existing province-and-city fields so their localities are not omitted. Barangay lists include every entry for the selected city or municipality.

The PSGC data is sourced from the [PSA](https://psa.gov.ph/classification/psgc/) and is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The package code is separately licensed under MIT.

## Documentation

Use the [documentation index](./docs/README.md) to find user guides, feature guides, developer references, and audit history. Start with the [project structure guide](./docs/PROJECT_STRUCTURE.md) for code placement or the [backend guide](./server/README.md) for API setup and operations.

### Environment and credentials

The root `.env` is used by Docker Compose; `server/.env` is for running the API directly. Both are ignored by Git. The tracked `.env.example` files contain placeholders and defaults only. Keep real credentials in these local environment files or a deployment secret manager, never in source code or `VITE_*` frontend variables. Before publishing a branch, confirm `.env` and `server/.env` are not staged (`git status --short`) and rotate any credential that was previously committed or shared.

## Docker: Full Stack

Docker Compose runs a MySQL-compatible MariaDB database, the Express API, and the built React app. Uploaded documents use persistent local storage by default; an external S3-compatible service can be configured optionally. No MySQL or object-storage installation is required on the Docker host.

1. Install Docker Desktop (Windows/macOS) or Docker Engine with the Compose plugin (Linux).
2. Create `.env` and set unique database and JWT secrets. Set `CORS_ORIGIN` to the exact frontend origin (for example `http://localhost:5173` locally or `https://your-domain.example` with TLS). Multiple trusted origins can be comma-separated. Never use the development JWT fallback in production. To use external S3-compatible storage instead of local uploads, set `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, and `MINIO_BUCKET`.
   To enable the shared AI assistant, set `PROGRESS_REPORT_AI_BASE_URL`, `PROGRESS_REPORT_AI_MODEL`, and `PROGRESS_REPORT_AI_API_KEY` in the server environment. All signed-in users share this server-side provider configuration; do not expose the API key through frontend variables or source code.
3. Add the EmailJS service ID, public key, private key, credentials template ID (named `EMAILJS_CREDENTIALS_TEMPLATE_ID` or `EMAILJS_USER_TEMPLATE_ID`), and OTP template ID to `.env` to enable account emails and password resets. Rotate any private key exposed in screenshots before configuring it. Keep the private key server-side; never use a `VITE_*` variable for it. The credentials template needs an email recipient field (`email` or `to_email`), `to_name`, `username` (the login email), `login_url`, `role`, and `password`; the OTP template needs an email recipient field (`email` or `to_email`), `to_name`, `passcode`, and `time`. Update the credentials template body to this content:

   ```html
   <p>Hello {{to_name}},</p>
   <p>An F1KD account has been created for you.</p>
   <p><strong>Username / login email:</strong> {{username}}<br>
   <strong>Role:</strong> {{role}}<br>
   <strong>Temporary password:</strong> {{password}}</p>
   <p><a href="{{login_url}}">Sign in to F1KD</a></p>
   <p>Keep your temporary password private.</p>
   <p>F1KD Support</p>
   ```

   Set `APP_URL` in `.env` to the URL recipients should open; local Docker defaults to `http://localhost:5173`.
4. Start the services from the repository root:

```sh
docker compose up --build -d
```

Open `http://localhost:5173` on the Docker host (the default web port). To use a different host port, set `WEB_PORT` in `.env`; other devices on the same network can open `http://<docker-host-LAN-IP>:<WEB_PORT>`, and the selected port must be allowed through the host firewall. The database and API are not published directly to the network.

Database data persists in the `mariadb-data` Docker volume; uploaded files persist under `server/data/uploads`. `docker compose down` keeps this data; `docker compose down -v` deletes the database volume and should not be used unless you intend to erase it. Back up the SQL database and uploaded files before moving to a different Docker host; local files are not automatically synchronized to other hosts. If using external S3-compatible storage, back it up separately.

### What is a smoke test?

A smoke test is a quick check that a built component can perform one basic, important operation. It can catch packaging or runtime problems early, but it does not replace the full test suite or an end-to-end deployment check.

After building the backend image, this command verifies that Node can load `bcrypt` and generate a hash inside the container:

```sh
docker run --rm f1kd-backend node -e "require('bcrypt').hash('smoke-test-only', 4).then(() => console.log('bcrypt hash OK')).catch(error => { console.error(error); process.exit(1) })"
```

The temporary test value is not saved or sent anywhere. This check does not start the API or database and does not verify uploads, backups, TLS certificates, or user workflows. When the Compose stack is running, its health checks separately verify that the services respond.

### HTTPS deployment

The default Compose setup is for local development and serves HTTP only. For network or production use, provide a certificate chain and private key issued for the deployment hostname, then start with the TLS override. On Windows, set certificate paths in `.env` using absolute paths with forward slashes, for example `C:/f1kd-certs/fullchain.pem` and `C:/f1kd-certs/privkey.pem`; do not put certificates or private keys in the repository. Set `WEB_PORT=80` and `HTTPS_PORT=443` in `.env`, then run:

```sh
docker compose -f docker-compose.yml -f docker-compose.tls.yml up --build -d
```

HTTP requests on port 80 redirect to HTTPS; the browser and API are served through TLS on port 443. Set `CORS_ORIGIN` to the HTTPS site origin. Install a publicly trusted certificate for public deployments, restrict inbound firewall access to the needed ports, and renew the certificate before expiry. This secures browser-to-web traffic; container-to-container traffic on the Docker network remains private but is not separately encrypted.

After the session security update, existing browser sessions must sign in again once. Refresh tokens are now rotated and stored server-side; signing out or changing a password revokes refresh sessions.

### Encryption at rest and backups

The Docker configuration does not enable MariaDB or local-file encryption at rest. Protect the host storage that contains Docker's named volumes and `server/data/uploads` with full-disk encryption (for example, BitLocker on Windows or LUKS on Linux), and encrypt backup files and their storage separately. Confirm that Docker Desktop's data disk/WSL virtual disk and every backup destination are on encrypted storage. If uploads use external object storage, enable that provider's storage and backup encryption. This repo cannot safely activate portable database/file encryption without the deployment's key-management service and key-rotation/recovery plan.

An existing local MySQL/MariaDB database is not copied automatically. Export it with `mysqldump`, start the stack, then import the dump into the `mariadb` service before using the app. Copy existing local document files into `server/data/uploads`; changing the database host alone does not migrate documents. Existing MinIO-backed deployments must migrate their stored objects and update document paths before switching to local uploads.

For the local Express API, copy `server/.env.example` to `server/.env` and set the same five EmailJS variables there.

To stop without deleting stored data:

```sh
docker compose down
```

## Local Development

For the complete application, including the API, database, and local document storage, use the Docker Compose setup above. For frontend-only work, install the root dependencies and run Vite:

```sh
npm install
npm run dev
```

The Vite development server expects the backend to be available for authenticated data workflows. See the [server guide](./server/README.md) for backend environment, database, and development setup. Local role-testing shortcuts are only enabled in development and must not be enabled in production.

Run the frontend production build and preview with:

```sh
npm run build
npm run preview
```

Use the scripts in `package.json` for focused tests. `npm test` runs the configured test suite.
