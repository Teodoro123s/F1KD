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

## Community record lifecycle

Archiving a school, group, batch, mother, child, user, or eligible ended project is initially reversible and does not immediately delete the record or its related data. Archiving a parent does not immediately archive or delete descendants. Archived records and records under archived parents are excluded from active operational selections; historical records remain available to reports while retained.

Superadmins manage school and user archives. Community Coordinators manage groups, batches, mothers, children, and Health Worker accounts only within their assigned school. User archiving immediately blocks sign-in and revokes existing sessions; restoring an account preserves its prior Active or Suspended status. Admin, Partner, and Health Worker roles cannot access archive management. Restore operations validate that parent records are active first; for example, a child cannot be restored while its mother is archived.

Permanent deletion through the user-management API is disabled; `DELETE /api/users/:id` returns `405 Method Not Allowed`. User accounts can be restored during the retention period, then are permanently purged after nine calendar months. Purging removes account identity and authentication-only data while preserving linked health records and activity history with user-identifying attribution anonymized. Permanent deletion is also disabled for schools, groups, batches, mothers, children, and programs; use archive/restore workflows instead. Ended projects use the Projects module's Archived Projects view; individual beneficiary, organizational, and user archives use the Archive module. The user archive migration is [`migrations/20261113_user_archiving.sql`](./migrations/20261113_user_archiving.sql); database bootstrap includes matching idempotent metadata additions.

### Automatic archive retention

The backend permanently purges archived records after **nine calendar months** from their `archived_at` timestamp. The retention job runs when the backend starts and then once per day. For groups, batches, and schools, the purge also removes linked groups/batches, mothers, children, check-up and other linked health history, and associated record-linked notifications and activity—even when descendants were not individually archived. For archived users, the account and account-only data are purged, but operational health records are kept; user IDs and direct identity in nullable attribution columns, activity descriptions, and notifications are anonymized. Archiving itself remains non-destructive; permanent deletion occurs only once the retention deadline has passed and a purge run takes place.

Uploaded documents and photos linked only to purged records are deleted from local or MinIO storage after the database transaction commits. File deletions that fail are held in `archive_file_deletion_queue` and retried on later job runs; files still referenced by another record are not deleted. System activity not linked to purged records is retained.

The backend schema bootstrap creates the retry queue automatically. For explicit database migration workflows, apply [`migrations/20261102_archive_retention.sql`](./migrations/20261102_archive_retention.sql) and [`migrations/20261113_user_archiving.sql`](./migrations/20261113_user_archiving.sql) before deploying these retention features. Existing archived records already older than nine months are eligible at the first purge run after deployment. Back up the database and document storage before enabling this irreversible policy.

The opt-in MariaDB archive/report integration test runs only when `F1KD_RUN_ARCHIVE_DB_TESTS=1`, `DB_HOST` is loopback, and `DB_NAME` begins with `f1kd_test`. It drops and reapplies archive metadata in that dedicated database, so do not point it at a shared, staging, or production database. It seeds synthetic mothers, children, check-ups, vaccinations, program distributions, and receipt evidence; compares period-specific Progress Report results and generated CSV values before and after school/group/batch/program archive and restore; verifies Admin/Partner report access and archive denial plus role-scoped operational reporting; and removes its synthetic records afterward. It intentionally leaves the test database itself in place, so an empty `f1kd_test_*` schema remains until manually removed.

## Beneficiary list pagination

`GET /api/mothers` and `GET /api/children` return active, in-scope records in pages. Both accept `page` (default `1`), `perPage` (default `100`, maximum `100`), `search` (up to 120 characters), `communityId`, `groupId`, `batchId`, `sortBy` (`id`, `name`, `code`, or `createdAt`), and `sortOrder` (`asc` or `desc`). Responses include `pagination.page`, `pagination.perPage`, `pagination.total`, and `pagination.totalPages`. Invalid pagination, filters, search values, or sort options return `400`.

The backend applies authorization scope and archive exclusions before counting or paging. Mother check-ups are loaded only for mothers in the returned page; child check-ups are fetched in one batch for the returned page. Existing frontend callers that need a complete list use the API wrappers' bounded page aggregation; callers may pass `{ page, perPage, ...filters }` to retrieve one page.

### Shared pagination controls

Community, User Management, Beneficiary, Monitoring, Archive, Reports/Notifications, and Progress Report screens use the shared responsive `src/components/ui/Pagination.jsx` control. It provides consistent page-number navigation and a visible result range; screens that support page-size selection retain their own available page sizes. On narrow screens, the control condenses to the active page and previous/next navigation. This shared UI does not change each screen's API paging, filtering, or data-loading behavior.

## Shared AI assistant

The AI Reporting Assistant uses one shared, server-side OpenAI-compatible chat-completions configuration for all signed-in users. The default endpoint uses Google Gemini:

```env
PROGRESS_REPORT_AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
PROGRESS_REPORT_AI_MODEL=gemini-3.1-flash-lite
PROGRESS_REPORT_AI_API_KEY=your-provider-api-key
```

For Docker Compose, set all three values in the repository-root `.env` file; Compose forwards them only to the backend. For a direct backend deployment, set them in `server/.env`. The server appends `/chat/completions` to the base URL. Do not put the API key in frontend variables, source code, URLs, or logs. Leave the key unset to keep AI unavailable. Restart or recreate the backend after changing environment settings.

`PROGRESS_REPORT_AI_MODEL` can be set to another Gemini model ID supported by the configured endpoint and enabled for the Google AI project, such as `gemini-3.6-flash` or `gemini-3.1-pro-preview`. The setting applies server-wide; users cannot select a model or provide personal API keys in the UI. Check Google's [current model list](https://ai.google.dev/gemini-api/docs/models) before switching.

Report-proposal requests cap generated output at 768 tokens to reduce provider token-per-minute usage. If the provider still returns HTTP 429, wait before retrying; repeated failures may require the administrator to increase the provider's rate limit.

AI reporting currently supports database-backed report previews and CSV export. It does not generate XLSX files, charts, or model-written analyses of beneficiary rows. Do not treat the model's field selection or explanation as calculated data; report values come from the existing reporting service.

For module-by-module capabilities, role access, inputs sent to the model, and limitations—including endpoints that are not wired to a screen—see [Integrated AI: Modules, Purpose, Scope, and Limits](../docs/INTEGRATED_AI.md).

The deployment migration [`migrations/20261116_drop_user_ai_configurations.sql`](./migrations/20261116_drop_user_ai_configurations.sql) removes the obsolete per-user encrypted-key table and its saved entries. Apply it when upgrading an existing database; schema bootstrap no longer creates that table. The API key is server-wide, so all users share the provider account's quota and billing. AI output is advisory only and is not clinical advice.

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

## Synthetic demo data

For a development or test database, connect with the MySQL client from the `server` directory and run `SOURCE scripts/seed_demo_data.sql;`. It creates one sample school, two groups, three batches (two assigned to the first group and one to the second), ten mothers per batch, and seven children per batch. Two mother profiles and two child profiles per batch have all fields used by the app's profile-completion checks. It also creates 42 maternal check-ups (one per mother, with three for each complete maternal profile) and 63 child check-ups (weeks 1, 4, and 8 for every child). Names, measurements, and contact values are synthetic; no document files are created, so the child document status remains pending until real documents are uploaded.

The script uses the `DEMO-*` code prefix and can be re-run to refresh those records. It replaces monitoring, vaccine, and dental records for the demo beneficiaries, so do not use it against production or a shared database.
