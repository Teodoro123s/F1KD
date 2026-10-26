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

This repeatable seed creates or refreshes two clearly labeled demo schools, each with two groups and two batches per group. Each of the eight batches gets 10 mothers and 10 children, for 80 mothers and 80 children total. Each school has its own Community Organizer, and each group has a dedicated Health Worker. It creates one school-scoped maternal program and one school-scoped child program per school, with sample program check-in entries for all 80 mothers and 80 children; seven beneficiaries per batch are marked received. Maternal monitoring uses the standard prenatal checkpoints at gestational weeks 8, 10, 12, 16, 20, 24, 28, 32, and 36. The expected total is the number of those checkpoints still due at registration, using gestational age from LMP and prenatal registration date (or the recorded gestational age). Each child receives a consecutive Month 1–24 growth-checkup history, for 1,920 child monitoring records total. Program check-ins are separate from maternal and child health check-up histories. Checkup records are synthetic demo data, not clinical records.

It also creates a shared Admin and Partner, two school-specific Community Organizers, and four Health Workers (one per group). All eight accounts use `SAMPLE_USER_PASSWORD`; set it to a private local test password at least 8 characters long. Set `DB_PORT` to the host port for your local database (3307 in the Docker setup used here; use 3306 if that is your configured port). In PowerShell, set `$env:DB_PORT = '3307'` and `$env:SAMPLE_USER_PASSWORD = 'choose-a-local-test-password'` before running the seed command. The seed does not create another Superadmin account.

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

- `GET /api/notifications` — paginated notification list; supports `page`, `perPage`, `search`, `category`, and `readStatus` (`all`, `read`, or `unread`). Unread notifications are listed before read notifications, with newest first within each group. Summary counts cover the user's entire authorized notification scope, independent of list filters.
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
PROGRESS_REPORT_AI_BASE_URL=https://api.groq.com/openai/v1
PROGRESS_REPORT_AI_MODEL=openai/gpt-oss-20b
PROGRESS_REPORT_AI_API_KEY=your_groq_api_key
```

F1KD uses Groq as its cloud AI provider. The server appends `/chat/completions` to the base URL and sends the API key as a bearer token. Keep the key only in the backend environment file. Leave the URL and model unset to keep AI unavailable. Restart the backend after changing these settings.

For module-by-module capabilities, role access, inputs sent to the model, and limitations—including endpoints that are not wired to a screen—see [Integrated AI: Modules, Purpose, Scope, and Limits](../docs/INTEGRATED_AI.md).

Keep the model endpoint on a trusted private network, configure a key if supported, and review its data retention practices. AI output is advisory only and is not clinical advice.

The server creates and migrates the application schema on first run, but it does
not create a default user account. Provision the first Superadmin through your
database administration process before signing in.

To remove accounts previously generated by the local test-role sign-in shortcut, apply
[`migrations/20261019_remove_test_role_accounts.sql`](./migrations/20261019_remove_test_role_accounts.sql)
to the application database after upgrading. The shortcut and its account-creation logic
are no longer available.
