# Backend (Express + MySQL)

Quick setup:

```bash
cd server
npm install
cp .env.example .env
# edit .env to set DB_* variables
npm run dev
```

## Synthetic sample data

With the backend database configured and available, run this from the repository root:

```bash
DB_PORT=3307 SAMPLE_USER_PASSWORD='choose-a-local-test-password' npm --prefix server run seed:sample
```

This repeatable seed creates or refreshes one clearly labeled demo school, two groups, two batches per group, 10 mothers per batch, and children for 8 mothers per batch. Maternal monitoring uses the standard prenatal checkpoints at gestational weeks 8, 10, 12, 16, 20, 24, 28, 32, and 36. The expected total is the number of those checkpoints still due at registration, using gestational age from LMP and prenatal registration date (or the recorded gestational age): the demo includes 8/8, 7/7, and 5/5 progress totals. Individual clinical results may require additional care; the app does not automatically infer extra checkups from laboratory results. It also adds a consecutive Month 1–24 growth-checkup history for every seeded child: 768 child monitoring records across 32 children. Seven children per batch receive a completed receipt for the `DEMO: Child Growth Support Program`, for 28 of 32 children total. Program receipt completion is separate from monthly checkup history. Checkup records are synthetic historical demo data, not clinical records.

It also creates an Admin, Community Organizer assigned to the demo school, Partner, and two Health Workers (one per group). All five accounts use `SAMPLE_USER_PASSWORD`; set it to a private local test password at least 8 characters long. Set `DB_PORT` to the host port for your local database (3307 in the Docker setup used here; use 3306 if that is your configured port). In PowerShell, set `$env:DB_PORT = '3307'` and `$env:SAMPLE_USER_PASSWORD = 'choose-a-local-test-password'` before running the seed command. The seed does not create another Superadmin account.

The seed only updates records with its `DEMO-*` codes, its named sample program, and its `@f1kd.test` accounts. It rebuilds maternal checkups for those demo mothers to keep their generated totals exact; it does not delete other application data. Run the focused seed-plan test with `npm --prefix server run test:sample-seed`.

Available endpoints:
- `GET /api/health` — health check
- `GET /api/users` — list users
- `POST /api/users` — create user `{ "name": "...", "email": "..." }`
- `GET /api/mothers/:id/claims` — list internally tracked PhilHealth claim records
- `POST /api/mothers/:id/claims` — create a claim record (Community Coordinator or Health Worker)
- `PUT /api/mothers/:id/claims/:claimId` — update a claim record (Community Coordinator or Health Worker)

Claim records track a reference, date, status, amount, and notes; they do not submit claims to PhilHealth.

## Notifications

Notification read state is stored per user in `notification_reads`, so it persists across refreshes and sessions. Per-user category preferences are stored in `notification_preferences`; disabling a category hides its notifications from the timeline and unread counts without deleting them. All notification routes require authentication and apply role, recipient, school, and group scope before returning or changing data.

- `GET /api/notifications` — paginated notification list; supports `page`, `perPage`, `search`, `category`, and `readStatus` (`all`, `read`, or `unread`). Summary counts cover the user's entire authorized notification scope, independent of list filters.
- `POST /api/notifications/:id/read` — mark one authorized notification as read (kept for compatibility).
- `PATCH /api/notifications/:id/read` — set `{ "isRead": true|false }` for one authorized notification.
- `POST /api/notifications/read-all` — mark all unread notifications in the caller's authorized scope as read.
- `POST /api/notifications/bulk-read` — set `{ "ids": [1, 2], "isRead": true|false }` for up to 100 authorized notification IDs; inaccessible IDs are not modified.
- `GET /api/notifications/preferences` — get category visibility preferences supported by the caller's role.
- `PUT /api/notifications/preferences` — save `{ "preferences": [{ "category": "Community", "enabled": false }] }`; categories outside the caller's role are rejected.

## Community batch deletion

`DELETE /api/community/batches/:id` permanently deletes the batch and its assigned beneficiaries in one database transaction. Mothers assigned to the batch and their children are deleted; children assigned directly to the batch are also deleted. Database cascade rules remove their checkups and related health records. If any deletion fails, the transaction rolls back and the batch and beneficiaries remain intact.

Deleting a group preserves the batches, mothers, children, and health records. It removes the group and its batch links, then clears group assignments and batch assignments for beneficiaries linked through that group. Health workers assigned to the group are also unassigned.

## Private AI assistants

Optional AI features use a backend-configured OpenAI-compatible chat-completions API. Configure:

```env
PROGRESS_REPORT_AI_BASE_URL=http://127.0.0.1:11434/v1
PROGRESS_REPORT_AI_MODEL=your-local-model
PROGRESS_REPORT_AI_API_KEY=
```

For Docker Compose, set `PROGRESS_REPORT_AI_BASE_URL` to an endpoint reachable from the backend container (for example, an Ollama service on the same private Docker network or `http://host.docker.internal:11434/v1` when the model runs on the Docker host). The model name must match the server's installed model. The server appends `/chat/completions` to the base URL. Leave the URL and model unset to keep AI unavailable. Restart the backend after changing these settings.

For module-by-module capabilities, role access, inputs sent to the model, and limitations—including endpoints that are not wired to a screen—see [Integrated AI: Modules, Purpose, Scope, and Limits](../docs/INTEGRATED_AI.md).

Keep the model endpoint on a trusted private network, configure a key if supported, and review its data retention practices. AI output is advisory only and is not clinical advice.

The server will create a simple `users` table on first run if it doesn't exist.

To remove accounts previously generated by the local test-role sign-in shortcut, apply
[`migrations/20261019_remove_test_role_accounts.sql`](./migrations/20261019_remove_test_role_accounts.sql)
to the application database after upgrading. The shortcut and its account-creation logic
are no longer available.
