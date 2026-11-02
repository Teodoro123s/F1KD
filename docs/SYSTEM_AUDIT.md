# F1KD System Audit

**Assessment date:** 2026-11-02  
**Status:** Source review, automated checks, and isolated archive persistence verification complete; authenticated browser verification remains blocked

## Executive assessment

The application builds successfully. The initial configured test command passed but covered only 58 of 99 repository-owned test files. Running all discovered tests exposed six failures in four older API test files; their JWT fixtures omitted the server-side session identifier required by current authentication. Those tests were corrected to model valid sessions, and `npm test` now discovers the complete repository suite. The opt-in archive integration test now passes against a dedicated synthetic database, including beneficiary archive/restore and historical report equivalence checks.

Static inspection found role and scope enforcement in both route guards and backend middleware, and unauthenticated requests to nine protected local API paths returned `401`. Integration checks verified role-scoped report access and archive denials, but used synthetic API requests rather than browser authentication. No critical or high-severity defect was established by the evidence collected. This is not a full security certification: authenticated browser workflows, production data, performance, and deployment configuration were not exercised.

## Scope and evidence

Reviewed the React route and permission configuration, sidebar and module structure, backend middleware and API registration, role/access documentation, database schema documentation, archive UI/API wiring, and automated test inventory.

The source-level module inventory covered Dashboard; Community and Archive; Beneficiaries (mother and child); Monitoring and check-ups; Projects and receipt history; Progress Reports; User Management; Notifications; Activity Reports; AI Settings; Profile; and Settings. Backend route registration and middleware covered authentication, users, community, archive, mothers, children, projects/programs, reports, Progress Reports, notifications, documents, and AI settings. This inventory review is not equivalent to authenticated workflow testing.

The following checks were run:

- `npm run build` — **PASS**.
- Baseline `npm test` — **PASS: 234 passed, 0 failed, 1 skipped** (235 tests; 58 explicitly listed files).
- Baseline full discovery — **FAIL: 362 passed, 6 failed, 1 skipped** (369 tests across 99 files).
- Final `npm test` — **PASS: 368 passed, 0 failed, 1 skipped** (369 tests across 99 files).
- The four previously failing API test files were also rerun directly — **PASS: 6 passed, 0 failed**.
- Opt-in `server/test/archive_persistence.integration.test.js` — **PASS: 1 passed, 0 failed, 0 skipped**, against the isolated `f1kd_test_audit_20261102` database.
- The archive integration test verified school, group, batch, ended-project, mother, and child archive/restore; persisted metadata and activity; active-list exclusion; parent/child behavior; role denials; and unchanged historical report, CSV, and distribution results for all five roles.
- Post-test cleanup verification — **PASS**. The dedicated test database had zero rows in `communities`, `groups`, `batches`, `programs`, `mothers`, `children`, `users`, and `activity_logs`. The application database `f1kd` was not used or modified.
- Local `/api/health` — **PASS: HTTP 200**.
- Unauthenticated GET requests to `/api/users`, `/api/archives`, `/api/community/communities`, `/api/mothers`, `/api/children`, `/api/programs`, `/api/progress-report/summary`, `/api/notifications`, and `/api/reports/activity` — **PASS: HTTP 401 for all nine paths**.
- Browser inspection — **PARTIAL**. The local app rendered the login page, but no authenticated browser workflow was run.
- Performance/load, full accessibility, and deployment configuration checks — **NOT TESTED**.

The archive integration test is opt-in and requires `F1KD_RUN_ARCHIVE_DB_TESTS=1`, loopback database access, and a database name beginning with `f1kd_test`. It was run only on a dedicated test database, not on the configured application database.

## Findings

### F1KD-AUD-01 — Default test command omits repository tests

- **Module:** Test configuration
- **Category:** Testing / reliability
- **Issue:** `npm test` explicitly lists 58 test files, while 99 repository-owned test files were discovered. The default green result therefore does not represent all available test coverage.
- **Evidence:** `package.json` has an explicit test-file list. The broader Node test run discovered 369 cases and reported six failures, one skip, and 362 passes.
- **Severity:** Medium
- **Recommended fix:** Update the affected legacy test fixtures to create valid test sessions, then make the default test command discover or explicitly include all supported repository test files.
- **Status:** Fixed. `npm test` now uses Node's test discovery and covers all 99 repository test files.

### F1KD-AUD-02 — Four API test files use obsolete authentication fixtures

- **Module:** Community, user management, documents, and activity reports
- **Category:** Testing / authorization assurance
- **Issue:** Six tests fail with `401` responses because their signed JWT fixtures omit `sid` and their mocks do not return a corresponding `auth_sessions` row. The current middleware rejects tokens without a session identifier and checks the session against the database.
- **Evidence:** Failures occurred in `server/test/community_batch_update.test.js`, `server/test/coordinator_assignment.test.js`, `server/test/documents_authorization.test.js`, and `server/test/reports_activity.test.js`. The relevant middleware is `server/middleware/auth.js`. All six failures are in tests omitted from `npm test`.
- **Severity:** Medium
- **Recommended fix:** Align these test harnesses with the current session model, following the existing session-mocking pattern used by other API tests. Preserve real middleware coverage; do not weaken session validation.
- **Status:** Fixed. Test fixtures now provide `sid` and mocked active session records; the real authentication middleware remains in place.

### F1KD-AUD-03 — Individual beneficiary archive action is unavailable in the UI

- **Module:** Archive / Beneficiaries
- **Category:** Functionality / UX
- **Issue:** The Archive page includes mother and child archive record types, and the backend supports archiving them, but the frontend currently calls `apiArchiveRecord` only for community structures and projects. There is no current UI action to initiate archiving an individual mother or child.
- **Evidence:** `src/pages/Community/ArchivePage.jsx` includes `mother` and `child` types for Community Coordinators. Searches of frontend archive API usage found calls in `CommunityPage.jsx` and `SuperAdminCommunityPage.jsx`, but none for beneficiary records. Before this audit, the role guide described removed row actions; it has now been corrected.
- **Severity:** Medium
- **Recommended fix:** Preserve the explicit request to remove the mother and child Archive buttons. Reconcile the guide with the current UI and record that an alternative beneficiary archive entry point needs a product decision; do not silently reintroduce the removed buttons.
- **Status:** Partially addressed. Role documentation now describes the current UI accurately. Whether individual beneficiary archives should remain API-only or gain a different UI entry point still needs a product decision; the explicitly removed buttons were not restored.

### F1KD-AUD-04 — Authenticated browser workflows and responsive behavior remain unverified

- **Module:** All role-specific UI modules
- **Category:** Testing / accessibility / UX
- **Issue:** The available evidence does not establish that each role can complete its permitted workflows, that direct UI routes behave correctly for each role, or that mobile, keyboard, and screen-reader behavior works in practice.
- **Evidence:** The shared browser was at `/login`; no synthetic role accounts were available. The project has utility and API tests but no configured browser/component interaction suite. Source-level accessibility and responsive styles were inspected, but not exercised across authenticated pages or viewport sizes.
- **Severity:** Medium
- **Recommended fix:** Provision isolated synthetic accounts and records for all five roles, then add repeatable browser coverage for key permitted/denied workflows, keyboard/modal behavior, and representative viewport sizes.
- **Status:** Blocked pending isolated test accounts/environment

### F1KD-AUD-05 — Archive persistence and historical report equivalence were not verified

- **Module:** Archive / Database / Progress Reports
- **Category:** Database / data integrity
- **Issue:** Archive persistence and historical-report equivalence required verification against an isolated database.
- **Evidence:** The opt-in integration test passed against `f1kd_test_audit_20261102`. It exercised school, group, batch, project, mother, and child archive/restore; metadata and activity persistence; active-list filtering; and historical report, CSV, and distribution equivalence for all five roles. The dedicated test tables were independently confirmed empty after cleanup.
- **Severity:** Medium
- **Recommended fix:** Keep this opt-in integration test in the pre-deployment verification process and continue running it only against disposable, isolated synthetic databases.
- **Status:** Verified for the isolated test database. Production/shared database behavior remains untested.

## Verified controls and positive evidence

- The backend middleware checks a server-side session and refreshes role and scope information from the database for protected requests.
- Existing default-suite authorization, pagination, archive API, validation, and operational tests passed in the baseline run.
- Nine protected local GET endpoints returned `401` without credentials; no protected data was returned.
- The production frontend build completed successfully.
- Backend review did not establish a high-confidence authorization or data-integrity vulnerability in the reviewed code. This is limited to static inspection and existing tests, not a penetration test.

## Role and UI verification matrix

The archive integration test used five synthetic roles with operational authorization middleware and compared historical report payloads, CSVs, and distribution results before and after archive/restore. It does **not** create authenticated browser sessions or verify frontend navigation and controls.

| Role | Isolated API/report checks | Authenticated browser workflows | Responsive/keyboard checks |
|---|---|---|---|
| Superadmin | PASS — historical reports unchanged; school archive/restore permissions exercised | NOT TESTED — no isolated browser login session | NOT TESTED |
| Admin | PASS — historical reports unchanged; archive management denied | NOT TESTED — no isolated browser login session | NOT TESTED |
| Community Coordinator | PASS — archive/restore actions, scope checks, and historical reports exercised | NOT TESTED — no isolated browser login session | NOT TESTED |
| Partner | PASS — historical reports unchanged; archive management denied | NOT TESTED — no isolated browser login session | NOT TESTED |
| Health Worker | PASS — historical reports unchanged; archive management denied | NOT TESTED — no isolated browser login session | NOT TESTED |

### Beneficiary archive UI decision

The requested removal of mother/child Archive buttons remains in effect. The Archive module can list and restore archived beneficiaries, but the current frontend has no action to initiate an individual beneficiary archive. The integration test verifies backend archive/restore behavior only. Keep the removed controls absent; a separate, explicit product decision is needed before adding another initiation path.

### Accessibility, performance, and deployment readiness

- **Accessibility:** Not formally tested. The login page was observed, but there was no keyboard-only, screen-reader, contrast, or authenticated page audit.
- **Responsive behavior:** Not tested across authenticated roles or viewports.
- **Performance:** No load, latency, or large-dataset benchmark was run.
- **Deployment readiness:** No deployment configuration, migration rollout, backup/restore, or production-like startup review was performed. These remain unverified, not pass.

## Changes made after the initial findings

- Changed `npm test` from a hand-maintained file list to Node's test discovery so the default command covers repository-owned tests.
- Updated four API test harnesses to supply valid session IDs and mocked database sessions. Also updated the community batch fixture for active-archive filtering and the Health Worker document test to include its required group assignment.
- Extended `server/test/archive_persistence.integration.test.js` to cover direct mother/child archive and restore, persisted reasons/actor metadata/activity, active-list behavior, parent/child semantics, and report/CSV equivalence.
- Corrected `docs/ROLES_AND_ACCESS.md` so it no longer claims there are beneficiary row archive actions.
- Created and used only the isolated `f1kd_test_audit_20261102` schema for synthetic integration testing; independently verified cleanup. The configured application schema `f1kd` was not changed.

## Follow-up implementation notes — 2026-11-02

- Added a nine-calendar-month automatic archive-retention job in `server/services/archiveRetention.js`. It starts with the backend, then runs every 24 hours; expired parent records also expire their linked descendants and history. Record-linked activity/notifications are removed, and uploaded files are queued for retryable deletion after database commits. The retry-queue migration is `server/migrations/20261102_archive_retention.sql`; backend bootstrap also creates the queue.
- Standardized list pagination with the responsive shared control in `src/components/ui/Pagination.jsx`; existing feature state, page-size choices, and data-loading behavior remain feature-owned.
- Focused archive, archive API, and stored-file checks passed: **7 passed, 0 failed**.
- The latest full `npm test` run reported **390 passed, 1 failed, 1 skipped** (392 tests). The failure was `coordinator assignments are validated and changed atomically`: its mock rejected a `help_guidance_preferences` insert. This remains unresolved and the full suite is not currently green.
- These follow-up changes were source- and focused-test-checked only. The new retention job was not run against a live database or deployment; the documented database migration, backup/restore procedure, scheduler behavior in production, and user-facing browser flows remain unverified.

## Prioritized improvement plan

1. **Archive clarity:** Decide whether beneficiary archiving is intentionally API-only or should have a different UI entry point. Keep the removed row/profile buttons absent unless that decision changes.
2. **Role and UX verification:** Add isolated synthetic accounts and browser workflows for all five roles; test key forms, filters, actions, keyboard access, and responsive layouts.
3. **Deployment readiness:** Review performance and accessibility using measured results; review migration rollout, backup/restore, and production-like startup.
4. **Release check:** Keep the isolated archive integration test in the pre-deployment verification process.

## Limitations

No production/shared data was changed; the configured application database was not used. Archive persistence was tested in the isolated synthetic database. No authenticated browser workflow, file upload through the UI, performance load test, full screen-reader test, responsive authenticated-role check, or deployment configuration review was performed. These areas remain **NOT TESTED** or **BLOCKED**, not PASS.
