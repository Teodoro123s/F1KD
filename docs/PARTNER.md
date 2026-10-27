# Partner Guide

This guide describes the Partner role as currently implemented in F1KD: its purpose, modules, global operational scope, read-only limits, and related API behavior.

## Role summary

The canonical role value is `partner`. The interface commonly labels this role **Community Partner**.

Partner provides global operational review across schools. It is not a platform administrator and does not manage user accounts or operational data. The API permits read access to operational modules while denying operational writes.

## Modules and components available

The Partner sidebar contains Dashboard, Community, Beneficiary, Monitor, Projects, Progress Report, and Notifications. Profile and Settings are also available from the account menu. The Projects module retains the `/program` route and legacy `programs` API identifiers for compatibility.

| Module or component | Availability | Purpose and limits |
|---|---|---|
| **Dashboard** (`/dashboard`) | Available | Operational overview. Partner dashboard cards emphasize Community and Projects; shortcuts provide access to Projects, Community, and Progress Reports. |
| **Community** (`/community`) | Read-only | Review schools, groups, batches, and community records across the deployment. No school or community structure changes are allowed. |
| **Beneficiary** (`/beneficiary`) | Read-only | Review mother and child records and profiles across schools. No beneficiary creation, updates, or deletion. |
| **Monitor** (`/monitoring`) | Read-only | Review saved maternal and child check-up information. No check-up creation or updates. |
| **Projects** (`/program`) | Read-only | Review projects and receipt/check-in information across schools. No project, scope, or receipt changes. |
| **Progress Report** (`/progress-report`) | Read and export | Review and export operational progress reports. Exports are audited; report information is global operational data. |
| **Notifications** (`/notifications`) | Available | View global operational notifications, manage read state, and adjust supported preferences. User Management notifications are excluded. |
| **Profile** (`/profile`) | Available | View the signed-in Partner's own account details. |
| **Settings** (`/settings`) | Available | Change the signed-in account's password and adjust local appearance preferences. |
| **User Management** (`/user-management`) | **Not available** | User creation, updates, status changes, and deletion are reserved for Superadmin (with a separate school-limited Health Worker workflow for Community Organizers). |
| **System activity Reports** (`/reports`) | **Not available** | The global system activity Reports page is Superadmin-only. |

Although Beneficiary and Monitor routes are available to operational roles, Partner's access to them is read-only. The dashboard's smaller set of shortcuts does not expand or reduce the underlying API permission model.

## Scope and permissions

### Global operational scope

- Partner is not assigned to a school or group by the general authorization middleware.
- Read requests may cover operational records across the deployment.
- Optional screen filters narrow the displayed data, but do not grant account-management rights or permit data changes.
- List, details, and exports remain subject to their endpoint-specific rules.

### Read-only access

Partner can review the Community, Beneficiary, Monitoring, Projects, and Progress Report modules. The API denies operational writes, including attempts to change community structure, beneficiaries, check-ups, project configuration, and receipt records.

Project check-in photo documentation is view- and download-only for Partner accounts; Community Organizers manage photo uploads and removals.

Notification read state/preferences and permitted report-download audit events are account-level/report-support operations, not permission to edit operational records.

### Account and activity reporting boundaries

- Partner cannot create, edit, suspend, reactivate, or delete users.
- The global system activity Reports page and report-user/scope endpoints are Superadmin-only.
- Partner cannot use the coordinator-only activity workflow for managed Health Workers.
- Progress Report is available and is separate from system activity Reports.

### Boundaries from other roles

| Role | Relationship to Partner |
|---|---|
| **Superadmin** | Manages accounts and community structure globally and reviews system activity; has no Projects, Beneficiary, Monitoring, or Progress Report access. |
| **Admin** | Global operational review, also read-only, with an Admin-focused oversight dashboard. |
| **Community Organizer** | Manages operational records within one assigned school and manages that school's Health Workers. |
| **Health Worker** | Performs permitted check-ups, limited profile updates, and project receipts in an assigned group. |

## Dashboard, notifications, and reporting

- Dashboard summaries are built from operational data available to the Partner and refresh on demand and periodically.
- The Partner dashboard emphasizes Community and Project totals and offers shortcuts for Community, Projects, and Progress Reports.
- Notifications are global operational notifications; User Management notifications are excluded.
- Progress Report can be viewed/exported and is subject to report auditing. System activity Reports are not available to Partner.

## Safe operating practices

1. Use Partner accounts for operational review; request an appropriate scoped role if data-entry tasks are required.
2. Apply filters carefully and verify report dates/scope before exporting.
3. Treat beneficiary, monitoring, and report information as sensitive even when access is read-only.
4. Request Superadmin assistance for account or community-structure changes.
5. Verify that API write requests are rejected when testing Partner access; hiding or disabling a UI action is not the security boundary.
6. Protect the account with a unique password and follow local data-sharing and retention rules.

## Sample accounts

The synthetic seed creates a shared sample Partner account using the configured `SAMPLE_USER_PASSWORD`. It is local/demo data, not a production credential. See [server sample-data instructions](../server/README.md#synthetic-sample-data). Do not use sample credentials in a production deployment.

## Implementation references

- [Frontend route access](../src/App.jsx)
- [Role normalization and permission metadata](../src/utils/permissions.js)
- [Role-specific sidebar](../src/components/Sidebar.jsx)
- [Operational read-only enforcement and global scope](../server/middleware/authorize.js)
- [Community API](../server/routes/community.js)
- [Beneficiary API](../server/routes/mothers.js)
- [Child records and check-ups API](../server/routes/children.js)
- [Projects API (legacy `programs` identifiers)](../server/routes/programs.js)
- [Progress Report API](../server/routes/progressReport.js)
- [Notification access scope](../server/services/notificationAccess.js)
- [Dashboard behavior](../src/pages/Dashboard/DashboardPage.jsx)
- [Role access matrix](./ROLES_AND_ACCESS.md)
