# Admin Guide

This guide describes the Admin role as currently implemented in F1KD: its purpose, modules, global operational scope, read-only limits, and related API behavior.

## Role summary

The canonical role value is `admin`. The interface labels this role **Administrator**; `Administrator` is also normalized to `admin`.

Admin provides broad operational oversight across the deployment. It is an operational review role, not a platform account administrator. Admin can read operational records across schools, but the API denies operational writes and does not permit user administration.

## Modules and components available

The Admin sidebar contains Dashboard, Community, Beneficiary, Monitor, Program, Progress Report, and Notifications. Profile and Settings are also available from the account menu.

| Module or component | Availability | Purpose and limits |
|---|---|---|
| **Dashboard** (`/dashboard`) | Available | Global operational overview with beneficiary, community, program, and monitoring indicators. Provides review shortcuts; figures cover the accessible operational dataset rather than one assigned school. |
| **Community** (`/community`) | Read-only | Review schools, groups, batches, and community records across the deployment. Community structure changes are not allowed. |
| **Beneficiary** (`/beneficiary`) | Read-only | Review mother and child records and profiles across schools. Creating, editing, or deleting operational records is not an Admin capability. |
| **Monitor** (`/monitoring`) | Read-only | Review saved maternal and child check-up information. Admin cannot record or change check-ups. |
| **Program** (`/program`) | Read-only | Review programs and receipt/check-in information across schools. Program definitions, scopes, and receipt records cannot be changed by Admin. |
| **Progress Report** (`/progress-report`) | Read and export | Review and export operational progress reports. Exports are audited; report information is global operational data. |
| **Notifications** (`/notifications`) | Available | View global operational notifications, update read state, and manage the categories/preferences supported by the role. User Management notifications are excluded. |
| **Profile** (`/profile`) | Available | View the signed-in Admin's own account details. |
| **Settings** (`/settings`) | Available | Change the signed-in account's password and adjust local appearance preferences. |
| **User Management** (`/user-management`) | **Not available** | Superadmin owns global user creation, updates, status changes, and deletion. Admin cannot administer accounts. |
| **System activity Reports** (`/reports`) | **Not available** | The Reports page and its global activity endpoints are reserved for Superadmin. |

The sidebar includes operational module links, while the Admin dashboard offers review-oriented shortcuts for Monitoring, Programs, and Progress Reports. Access to a route does not grant write permission.

## Scope and permissions

### Global operational scope

- Admin is not assigned to a particular school or group in the general authorization middleware.
- Read requests for operational modules can cover records across schools.
- School/group filters provided by a screen narrow the view; they do not change the account's role or grant write access.
- API authorization is authoritative. A direct request or crafted form submission is subject to the same read-only restriction as the interface.

### Read-only operational access

Admin can review the modules listed above, including beneficiary and monitoring information, program configuration and check-ins, and Progress Reports. Operational writes are denied by the API. Password changes, notification read-state/preferences, and permitted report-download audit events are account-level/report-support actions, not permission to edit operational records.

Program check-in photo documentation is view- and download-only for Admin accounts; Community Organizers manage photo uploads and removals.

### Account administration

Admin cannot create, update, suspend, reactivate, or permanently delete user accounts through User Management. The full user-management API is Superadmin-only. Community Coordinators have a separate Health Worker-only workflow restricted to their own school; it does not apply to Admin.

### Boundaries from other roles

| Role | Relationship to Admin |
|---|---|
| **Superadmin** | Platform administration, global user management, community administration, and system activity reports. Superadmin has no Program, Beneficiary, Monitoring, or Progress Report access. |
| **Community Organizer** | Manages operational workflows within one assigned school and manages Health Workers in that school. |
| **Partner** | Global operational review with no operational writes or account administration. |
| **Health Worker** | Performs limited tasks within an assigned school and group, including permitted check-ups and receipts. |

Admin should be used for oversight and review, not account governance or data entry.

## Dashboard, notifications, and reporting

- Dashboard metrics and review pages use current operational records; the dashboard refreshes on demand and on its periodic interval.
- Notifications are global operational notifications, with User Management notifications excluded.
- The system activity Reports module is Superadmin-only. It is distinct from Progress Report, which Admin can read and export.
- Progress Report exports are subject to the report's filters and audit logging.

## Safe operating practices

1. Use Admin accounts for review and oversight; assign Community Organizer or Health Worker roles to staff who need operational write access.
2. Confirm any school/group filters before reviewing or exporting records.
3. Treat exported reports as sensitive operational data and follow the deployment's retention and sharing rules.
4. Request Superadmin assistance for account changes or school/community structure changes.
5. When verifying read-only behavior, test both the interface and a direct API write; the API should reject operational changes.
6. Protect the account with a unique password and keep authentication credentials private.

## Sample accounts

The synthetic seed creates a shared sample Admin account using the configured `SAMPLE_USER_PASSWORD`. It is local/demo data, not a production credential. See [server sample-data instructions](../server/README.md#synthetic-sample-data). Do not use sample credentials in a production deployment.

## Implementation references

- [Frontend route access](../src/App.jsx)
- [Role normalization and permission metadata](../src/utils/permissions.js)
- [Role-specific sidebar](../src/components/Sidebar.jsx)
- [Operational read-only enforcement and global scope](../server/middleware/authorize.js)
- [Community API](../server/routes/community.js)
- [Beneficiary API](../server/routes/mothers.js)
- [Child records and check-ups API](../server/routes/children.js)
- [Program API](../server/routes/programs.js)
- [Progress Report API](../server/routes/progressReport.js)
- [Notification access scope](../server/services/notificationAccess.js)
- [Dashboard behavior](../src/pages/Dashboard/DashboardPage.jsx)
- [Role access matrix](./ROLES_AND_ACCESS.md)
