# F1KD

F1KD beneficiary monitoring and reporting app.

## Philippine location data

The beneficiary address pickers use [`@aivangogh/ph-address`](https://www.npmjs.com/package/@aivangogh/ph-address), based on the Philippine Statistics Authority (PSA) PSGC snapshot as of June 30, 2026. It supplies 82 provinces and 42,010 barangays; NCR, the BARMM Special Geographic Area, and Isabela City are also available in the existing province-and-city fields so their localities are not omitted. Barangay lists include every entry for the selected city or municipality.

The PSGC data is sourced from the [PSA](https://psa.gov.ph/classification/psgc/) and is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The package code is separately licensed under MIT.

## Project documentation

- [Project structure](./docs/PROJECT_STRUCTURE.md) — frontend and backend folder ownership, Beneficiary canonical paths, and file placement rules.

- [Users, roles, permissions, and data scope](./docs/ROLES_AND_ACCESS.md) — module access, account-management limits, school/group scope, and practical verification.
- [Progress Report guide](./docs/PROGRESS_REPORT.md) — report setup, Results table/graph views, filters, exports, and role scope.
- [Superadmin user guide](./docs/SUPERADMIN.md) — role purpose, permissions, modules, recovery flow, and operational boundaries.
- [Community Organizer user guide](./docs/COMMUNITY_ORGANIZER.md) — assigned-school scope, operational modules, Health Worker account limits, and safe operating practices.
- [Admin user guide](./docs/ADMIN.md) — global operational oversight, read-only limits, modules, and reporting boundaries.
- [Partner user guide](./docs/PARTNER.md) — global operational review, read-only limits, and available reporting.
- [Health Worker user guide](./docs/HEALTH_WORKER.md) — assigned-school/group scope, permitted check-ups and receipts, and account boundaries.
- [Integrated AI guide](./docs/INTEGRATED_AI.md) — AI features by module, their purpose, scope, access, data handling, and limitations.
- [Server guide](./server/README.md) — backend setup, sample data, API behavior, and operational notes.

## Docker: Full Stack

Docker Compose runs a MySQL-compatible MariaDB database, MinIO document storage, the Express API, and the built React app. This does not require a MySQL installation on the Docker host.

1. Install Docker Desktop (Windows/macOS) or Docker Engine with the Compose plugin (Linux).
2. Create `.env` and set unique database, MinIO, and JWT secrets. Set `CORS_ORIGIN` to the exact frontend origin (for example `http://localhost:5173` locally or `https://your-domain.example` with TLS). Multiple trusted origins can be comma-separated. Never use the development JWT fallback in production.
   To enable per-user AI settings, configure `PROGRESS_REPORT_AI_BASE_URL`, `PROGRESS_REPORT_AI_MODEL`, and `AI_SETTINGS_ENCRYPTION_KEY` on the server. Users enter only their provider API key; the provider endpoint and model are server-managed. Generate the encryption key with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and keep it stable and backed up; losing it makes saved user API keys unreadable. If it is unset, AI credentials cannot be saved.
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
docker compose -f docker-compose.minio.yml up --build -d
```

Open `http://localhost:5173` on the Docker host (the default web port). To use a different host port, set `WEB_PORT` in `.env`; other devices on the same network can open `http://<docker-host-LAN-IP>:<WEB_PORT>`, and the selected port must be allowed through the host firewall. The database and API are not published directly to the network. The MinIO console is bound to the host only at `http://localhost:9001`.

Data persists in the `mariadb-data` and `minio-data` Docker volumes. Local-upload fallback files persist under `server/data/uploads`. `docker compose down` keeps this data; `docker compose down -v` deletes the database and MinIO volumes and should not be used unless you intend to erase them. Back up the SQL database and MinIO objects before moving to a different Docker host; volumes are local to the host and are not automatically synchronized to client devices.

### HTTPS deployment

The default Compose setup is for local development and serves HTTP only. For network or production use, provide a certificate chain and private key issued for the deployment hostname, then start with the TLS override. On Windows, set certificate paths in `.env` using absolute paths with forward slashes, for example `C:/f1kd-certs/fullchain.pem` and `C:/f1kd-certs/privkey.pem`; do not put certificates or private keys in the repository. Set `WEB_PORT=80` and `HTTPS_PORT=443` in `.env`, then run:

```sh
docker compose -f docker-compose.minio.yml -f docker-compose.tls.yml up --build -d
```

HTTP requests on port 80 redirect to HTTPS; the browser and API are served through TLS on port 443. Set `CORS_ORIGIN` to the HTTPS site origin. Install a publicly trusted certificate for public deployments, restrict inbound firewall access to the needed ports, and renew the certificate before expiry. This secures browser-to-web traffic; container-to-container traffic on the Docker network remains private but is not separately encrypted.

After the session security update, existing browser sessions must sign in again once. Refresh tokens are now rotated and stored server-side; signing out or changing a password revokes refresh sessions.

### Public mock demo on GitHub Pages

The GitHub Pages workflow publishes a read-only F1KD walkthrough with synthetic data. It does not connect to the API, database, or MinIO, and it must not contain real beneficiary information. The demo build is enabled only by the workflow's `VITE_DEMO_MODE=true` setting; regular local and Docker builds continue to use the backend.

The workflow's trigger and deployment branch are defined in the repository's GitHub Actions workflow. In **Settings → Pages**, set the build/deployment source to **GitHub Actions**. Run the deployment workflow from the Actions tab. GitHub displays the published URL in the Pages settings and deployment. GitHub Pages hosting is public, so keep this demo free of personal, health, account, and other private data.

### Encryption at rest and backups

The Docker configuration does not enable MariaDB or MinIO application-level encryption at rest. Protect the host storage that contains Docker's named volumes and `server/data/uploads` with full-disk encryption (for example, BitLocker on Windows or LUKS on Linux), and encrypt backup files and their storage separately. Confirm that Docker Desktop's data disk/WSL virtual disk and every backup destination are on encrypted storage. If these stores move to managed infrastructure, enable that provider's database, object-store, disk, and backup encryption. This repo cannot safely activate portable database/object encryption without the deployment's key-management service and key-rotation/recovery plan.

An existing local MySQL/MariaDB database is not copied automatically. Export it with `mysqldump`, start the stack, then import the dump into the `mariadb` service before using the app. Copy existing local document files into MinIO or `server/data/uploads` as appropriate; changing the database host alone does not migrate documents.

For the local Express API, copy `server/.env.example` to `server/.env` and set the same five EmailJS variables there.

To stop without deleting stored data:

```sh
docker compose -f docker-compose.minio.yml down
```

## Local Development

For the complete application, including the API, database, and document storage, use the Docker Compose setup above. For frontend-only work, install the root dependencies and run Vite:

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
