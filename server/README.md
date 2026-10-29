# Backend (Express + MySQL)

Quick setup:

```bash
cd server
npm install
cp .env.example .env
# edit .env to set DB_* variables
npm run dev
```

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
- `POST /api/notifications/download-success` — record a progress-report CSV download, including its filename. When a Health Worker downloads a report, active Community Organizers/Coordinators assigned to the same school receive the Downloads notification; the Health Worker does not receive their own notice. If no active CO is assigned, no notification is created.

### Check-up reminders

The backend reminder scheduler runs once per local calendar day at `CHECKUP_REMINDER_TIME` (default `08:00`) in `CHECKUP_REMINDER_TIMEZONE` (default `Asia/Manila`). It reads the `next_checkup_date` on maternal and child check-up records and creates `Monitoring` notifications for the community's assigned Community Organizer and active Health Workers assigned to that community and beneficiary group. Disabled Monitoring preferences are respected. Notifications use the existing recipient, read-state, unread-count, and retention behavior and link to the relevant beneficiary monitoring/profile page.

The scheduler creates reminders 3 days before, 1 day before, and on the scheduled date, plus one missed-check-up alert the day after if still incomplete. A recorded check-up on or after the scheduled date suppresses further reminders for that appointment. Updating or clearing `next_checkup_date` reschedules or cancels pending reminders; dates older than yesterday are not backfilled.

Apply [`migrations/20261026_checkup_reminders.sql`](./migrations/20261026_checkup_reminders.sql) when upgrading an existing database. It adds the child next-checkup date field and the unique notification idempotency key used to prevent duplicate delivery after retries or restarts. The backend also ensures these schema elements at startup. Configure the run time and timezone in the backend environment; Docker Compose forwards `CHECKUP_REMINDER_TIME` and `CHECKUP_REMINDER_TIMEZONE`.

Apply [`migrations/20261028_remove_legacy_user_columns.sql`](./migrations/20261028_remove_legacy_user_columns.sql) to an existing database to remove unused legacy columns from `users`. It preserves `consent_accepted_at`; notification read state is stored in `notification_reads`.

## Community batch deletion

`DELETE /api/community/batches/:id` permanently deletes the batch and its assigned beneficiaries in one database transaction. Mothers assigned to the batch and their children are deleted; children assigned directly to the batch are also deleted. Database cascade rules remove their checkups and related health records. If any deletion fails, the transaction rolls back and the batch and beneficiaries remain intact.

Deleting a group preserves the batches, mothers, children, and health records. It removes the group and its batch links, then clears group assignments and batch assignments for beneficiaries linked through that group. Health workers assigned to the group are also unassigned.

## Private AI assistants

AI reporting uses the backend-configured OpenAI-compatible chat-completions endpoint. The default configuration below uses Google Gemini; users enter a Google AI Studio API key, while the server controls the provider endpoint and model. A separate encryption key allows each signed-in operational user to save their own provider key:

```env
PROGRESS_REPORT_AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
PROGRESS_REPORT_AI_MODEL=gemini-3.1-flash-lite
AI_SETTINGS_ENCRYPTION_KEY=generate-a-unique-64-character-hex-key
```

Generate the encryption key with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. For Docker Compose, put it in the root `.env` file; Compose forwards it only to the backend. For a direct backend deployment, set it in `server/.env`. Keep this key stable and backed up: losing or rotating it makes previously stored user keys unreadable. Without it, the application refuses to save credentials.

The server appends `/chat/completions` to the configured base URL. Users only enter and test their provider API key; the settings page displays the configured provider and model name but does not expose the endpoint or secrets. Keys are encrypted per account and never returned by configuration endpoints. The report assistant sends the natural-language request to the provider, then retrieves report rows separately through the existing authenticated and role-scoped progress-report endpoint. Operational rows are not sent to the model. Leave the endpoint or default model unset to keep AI unavailable. Restart the backend after changing environment settings.

`PROGRESS_REPORT_AI_MODEL` can be set to another Gemini model ID supported by the configured endpoint and enabled for the Google AI project, such as `gemini-3.6-flash` or `gemini-3.1-pro-preview`. The setting applies server-wide; users cannot select a model in the UI. Check Google's [current model list](https://ai.google.dev/gemini-api/docs/models) before switching, and test the connection with a key that has access to the selected model.

Report-proposal requests cap generated output at 768 tokens to reduce provider token-per-minute usage. If the provider still returns HTTP 429, wait before retrying; repeated failures may require the administrator to increase the provider's rate limit.

AI reporting currently supports database-backed report previews and CSV export. It does not generate XLSX files, charts, or model-written analyses of beneficiary rows. Do not treat the model's field selection or explanation as calculated data; report values come from the existing reporting service.

For module-by-module capabilities, role access, inputs sent to the model, and limitations—including endpoints that are not wired to a screen—see [Integrated AI: Modules, Purpose, Scope, and Limits](../docs/INTEGRATED_AI.md).

Keep the model endpoint on a trusted private network, configure a key if supported, and review its data retention practices. AI output is advisory only and is not clinical advice.

The server creates and migrates the application schema on first run. It has no
built-in default user credentials. To create or recover a named Superadmin, set
`BOOTSTRAP_SUPERADMIN_EMAIL` and `BOOTSTRAP_SUPERADMIN_PASSWORD` in the backend
environment before startup. Startup creates the account only when that email
does not already exist. Existing passwords and suspended status are not changed.
Set `SELF_HEAL_ADMIN_CREDENTIALS=true` only when the configured account exists
without a password hash and you explicitly want startup to restore its password.
Remove both bootstrap variables to disable automatic recovery. See the
[Superadmin guide](../docs/SUPERADMIN.md) for security details.

To remove accounts previously generated by the local test-role sign-in shortcut, apply
[`migrations/20261019_remove_test_role_accounts.sql`](./migrations/20261019_remove_test_role_accounts.sql)
to the application database after upgrading. The shortcut and its account-creation logic
are no longer available.
