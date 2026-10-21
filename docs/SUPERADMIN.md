# Superadmin Guide

This guide describes the Superadmin role as currently implemented in F1KD: its responsibilities, access boundaries, available modules, account lifecycle, recovery behavior, and related backend components.

## Role summary

The canonical role value is `super_admin`. The frontend and backend accept common Superadmin spellings, including `Superadmin`, `Super Admin`, and `super_admin`.

Superadmin is a global administrative role, not a school or group operational role. It is intended for platform administration, account governance, school/community oversight, recovery, and system activity review.

Global scope applies only to authorized modules. Superadmin is explicitly excluded from operational modules such as Programs, Beneficiaries, Monitoring, and Progress Report. A global role does not override those module-specific denials.

## Modules and components available

The Superadmin sidebar contains Dashboard, Community, User Management, Reports, and Notifications. Profile and Settings are also available from the account menu.

| Module or component | Availability | Purpose and limits |
|---|---|---|
| **Dashboard** (`/dashboard`) | Available | Live overview of User Management, Community, Reports, and Notifications. It shows operational account status, staff missing required school/group assignments, school/group totals, operational sign-in activity, recent sign-ins, and unread notification counts. It refreshes on demand and every five minutes. It does not load beneficiary, child, or Program data. |
| **Community** (`/community`) | Available | Global view and management of schools, groups, and batches. Superadmin can administer the community hierarchy without a school assignment. |
| **User Management** (`/user-management`) | Available | Global account administration: create, view, edit, suspend/reactivate, and permanently delete users; inspect accounts by school/batch and open user details. Permanent deletion is restricted to Superadmin. |
| **Reports** (`/reports`) | Available | Review account sign-in and activity records and filter by school/group or user where supported. Ordinary operational login totals exclude Superadmin activity so system administrator sign-ins do not distort those reports. |
| **Notifications** (`/notifications`) | Available | View global `Community` and `User Management` notifications, manage notification read state, and set available preferences. This does not include `Programs` notifications. |
| **Profile** (`/profile`) | Available | View the signed-in Superadmin's own account details. |
| **Settings** (`/settings`) | Available | Change the signed-in account's password and adjust local appearance preferences. |
| **Programs** (`/program`) | **Not available** | No sidebar entry or permitted frontend route. The Programs API explicitly returns 403 for Superadmin requests. |
| **Beneficiary and Monitoring** | **Not available** | No permitted frontend routes for beneficiary records, check-ups, or monitoring workflows. These tasks belong to operational roles. |
| **Progress Report** (`/progress-report`) | **Not available** | The reporting UI and ordinary report data/options routes are restricted to operational roles. Superadmin may use aggregate Dashboard AI insights and AI availability checks, but cannot use report-building endpoints or access Progress Report data. |

## Scope and permissions

### Global administrative scope

- Superadmin requests are not assigned a `school_id` or `group_id` scope by the general operational middleware.
- Community and user-administration endpoints apply their own role checks. Superadmin can oversee records across schools and manage school structure.
- Reports access is system-wide where the report endpoint permits it. Standard sign-in totals and activity reporting exclude Superadmin-authored activity.
- Superadmin access does not imply access to every API. The Program router has an explicit Superadmin denial, and beneficiary, monitoring, and Progress Report page/data routes are not granted to the role.

### User lifecycle

Superadmin is the only role allowed to use the full `/api/users` account-administration endpoints. The API and UI support:

- creating accounts and assigning a role
- updating user profile fields and school/group assignments where valid
- suspending and reactivating accounts
- permanently deleting accounts
- reviewing users across schools

Community Coordinators have a separate, limited workflow to manage Health Worker accounts in their own school; it does not grant them Superadmin's global user-administration rights.

Accounts marked Suspended (or recognized inactive/pending statuses) cannot complete normal sign-in. Suspension is reversible; permanent deletion is destructive and should be reserved for cases where retention requirements permit removal.

### Boundaries from operational roles

| Role | Relationship to Superadmin |
|---|---|
| **Admin** | Global read-oriented operational access; not a system user administrator. |
| **Community Coordinator** | Runs operations within one assigned school and can manage that school's Health Workers. |
| **Partner** | Global read-oriented operational access; not a system user administrator. |
| **Health Worker** | Performs assigned-group work and has the narrowest operational scope. |

Superadmin should be used for platform administration, not day-to-day beneficiary, check-up, receipt, or progress-report work.

## Account bootstrap and recovery

`ensureSuperadminAccount()` in `server/services/superadminRecovery.js` is called during database initialization, login, and the Superadmin recovery/status flow. It:

1. Looks up the configured Superadmin email.
2. Creates an account if no matching email exists.
3. Corrects the role if it is not recognized as a Superadmin role.
4. Sets status to Active only when the existing status is empty.
5. Fills a missing password hash only when `SELF_HEAL_ADMIN_CREDENTIALS=true`.

The account email/password are configurable through `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD`. The source contains fallback values if those variables are omitted. **Before any shared or production deployment, set unique secrets, replace any fallback credentials, and verify that no default account password remains in use.** Do not put credentials in documentation, source control, logs, or support messages.

Recovery does not silently reactivate an account explicitly marked Suspended, and it does not replace a non-empty password hash. Password reset and normal password-change behavior remain separate authentication flows.

The repeatable sample-data seed creates Admin, Partner, Community Coordinator, and Health Worker accounts but intentionally does not create an additional Superadmin account. See [server sample-data instructions](../server/README.md#synthetic-sample-data).

## Notifications and activity reporting

- Superadmin notification scope is global but category-limited to `Community` and `User Management`.
- User creation, changes, suspension/reactivation, and other administrative activity can be recorded in activity logs and notifications.
- The Reports module focuses on non-Superadmin user sign-ins and permitted activity. Superadmin sign-ins are excluded from standard operational login totals.
- Program notifications are not delivered as a Superadmin category because Superadmin has no Program module access.

The Superadmin dashboard uses only these module-scoped sources: operational account records from User Management, school/group directory options from the Superadmin report-scope endpoint, non-Superadmin sign-in totals/activity from Reports, and category-filtered counts from Notifications. The unassigned count applies only to active Community Organizer/Health Worker accounts missing a required school or group; Admin and Partner accounts are not expected to have school assignments. The sign-in chart covers the most recent 30 days. Dashboard figures may be incomplete when a module request fails; the dashboard reports the failed source rather than treating the failure as a zero count.

## Safe operating practices

1. Use a named, personal Superadmin account; avoid sharing accounts.
2. Replace bootstrap fallback credentials before exposing the application beyond a private development environment.
3. Protect the account with a strong unique password and secure the email/password reset channel.
4. Grant operational roles to staff who need beneficiary, monitoring, Program, or Progress Report work instead of using Superadmin for those tasks.
5. Confirm school and group assignments when creating or changing operational accounts.
6. Review the target user carefully before suspension or permanent deletion; deletion may be irreversible.
7. Test both the interface and API after access-policy changes. Hiding a navigation link is not a substitute for server-side authorization.

## Implementation references

- [Frontend route access](../src/App.jsx)
- [Role normalization and permission metadata](../src/utils/permissions.js)
- [Role-specific sidebar](../src/components/Sidebar.jsx)
- [Backend authorization and global scope](../server/middleware/authorize.js)
- [Authentication and account recovery calls](../server/routes/auth.js)
- [Superadmin account recovery implementation](../server/services/superadminRecovery.js)
- [User administration API](../server/routes/users.js)
- [Community/school management UI](../src/pages/Community/CommunityPage.jsx)
- [Activity reporting API](../server/routes/reports.js)
- [Superadmin notification categories](../server/services/notificationAccess.js)
- [Program API denial](../server/routes/programs.js)
- [Dashboard behavior](../src/pages/Dashboard/DashboardPage.jsx)
- [Role access matrix](./ROLES_AND_ACCESS.md)
