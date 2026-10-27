# Superadmin Guide

This guide describes the Superadmin role, its access boundaries, account lifecycle, and related implementation.

## Role summary

The canonical role value is `super_admin`. Frontend and backend authorization normalize common role aliases. Superadmin is a global administrative role for account governance, school/community oversight, and system activity review. Global scope applies only to authorized modules; it does not grant access to Projects, Beneficiaries, Monitoring, or Progress Report.

## Available modules

The operational module is user-facing as **Projects**. Its `/program` route and `programs` API identifiers remain unchanged for compatibility.

| Module | Availability | Purpose and limits |
|---|---|---|
| Dashboard | Available | Overview of accounts, schools/groups, operational sign-ins, activity, and notifications. It does not load beneficiary or Projects data. |
| Community | Available | Global view and management of schools, groups, and batches. |
| User Management | Available | Create, view, update, suspend/reactivate, and permanently delete accounts across schools. |
| Reports | Available | Review permitted sign-in and activity records. Operational login totals exclude Superadmin activity. |
| Notifications | Available | View global Community and User Management notifications, manage read state, and set available preferences. |
| Profile and Settings | Available | View personal account details, change the account password, and adjust local preferences. |
| Projects | Not available | No permitted frontend route; the API denies Superadmin requests. |
| Beneficiaries and Monitoring | Not available | Operational record and check-up workflows are restricted to operational roles. |
| Progress Report | Not available | Report-building routes and data are restricted to operational roles. |

## Scope and permissions

- Superadmin requests are not limited to a school or group by the general operational middleware.
- Community and user-administration endpoints apply their own role checks.
- Reports are global where the endpoint permits it; standard operational sign-in totals exclude Superadmin activity.
- Explicit module-level denials take precedence over global scope.
- Community Coordinators can manage Health Worker accounts only in their assigned school; they do not have Superadmin's global account-administration rights.

Superadmin is the only role allowed to use the full `/api/users` account-administration endpoints. Account suspension is reversible; permanent deletion is destructive and should follow retention requirements.

## Account provisioning and recovery

The application does not use built-in Superadmin credentials. To bootstrap or recover a named Superadmin, set both `BOOTSTRAP_SUPERADMIN_EMAIL` and `BOOTSTRAP_SUPERADMIN_PASSWORD` in the backend environment, then restart the backend. On startup, F1KD creates that account only if the configured email is not already present. The password must meet the normal account policy; no default password is supplied.

If the account already exists, startup never replaces its password or reactivates a suspended account. To restore credentials only when the configured account has no password hash, explicitly set `SELF_HEAL_ADMIN_CREDENTIALS=true`; the configured password is hashed before storage. The configured email must already belong to a Superadmin—F1KD refuses to promote an account with a different role. Keep these values private. Remove both bootstrap variables to disable automatic recovery, or keep them configured if you want startup to recreate the account if it is missing.

## Notifications and activity reporting

- Superadmin notification scope is global but category-limited to Community and User Management.
- Administrative activity can be recorded in activity logs and notifications.
- Superadmin sign-ins are excluded from standard operational login totals.
- Project notifications are not delivered as a Superadmin category.

Dashboard figures use module-scoped sources. If a source fails, the dashboard reports the failed source rather than treating the failure as zero.

## Safe operating practices

1. Use a named, personal Superadmin account; avoid sharing accounts.
2. Protect bootstrap credentials and disable credential self-healing when it is no longer needed.
3. Use operational roles for beneficiary, monitoring, Projects, and Progress Report work.
4. Confirm school and group assignments when creating or changing operational accounts.
5. Review the target user carefully before suspension or permanent deletion.
6. Test both the interface and API after access-policy changes; hidden navigation is not a substitute for server-side authorization.

## Implementation references

- [Frontend route access](../src/App.jsx)
- [Role normalization and permission metadata](../src/utils/permissions.js)
- [Role-specific sidebar](../src/components/Sidebar.jsx)
- [Backend authorization and global scope](../server/middleware/authorize.js)
- [Authentication routes](../server/routes/auth.js)
- [User administration API](../server/routes/users.js)
- [Community/school management UI](../src/pages/Community/CommunityPage.jsx)
- [Activity reporting API](../server/routes/reports.js)
- [Superadmin notification categories](../server/services/notificationAccess.js)
- [Projects API denial (legacy `programs` identifiers)](../server/routes/programs.js)
- [Dashboard behavior](../src/pages/Dashboard/DashboardPage.jsx)
- [Role access matrix](./ROLES_AND_ACCESS.md)
