# Health Worker Guide

This guide describes the Health Worker role as currently implemented in F1KD: its purpose, modules, assigned-school/group scope, permitted operational tasks, and related API behavior.

## Role summary

The canonical role value is `health_worker`. The interface commonly labels this role **Health Worker**; `Health worker`, `healthworker`, and `health_worker` are normalized to the same role.

A Health Worker performs assigned-group beneficiary and program tasks, especially recording check-ups and program receipts. The role has the narrowest operational scope: an account must be assigned to a school, and group-level work is limited to its assigned group.

The token's `school_id` and `group_id` form the role's perimeter. A route parameter or submitted school/group ID cannot expand that perimeter. Operational access is denied when the required school assignment is missing; program receipt/check-in tasks also require a valid group assignment.

## Modules and components available

The Health Worker sidebar contains Dashboard, Community, Beneficiary, Monitor, Program, Progress Report, and Notifications. Profile and Settings are also available from the account menu. User Management is not shown and is not available.

| Module or component | Availability | Purpose and limits |
|---|---|---|
| **Dashboard** (`/dashboard`) | Available | Assigned-group overview with follow-up and assigned-program indicators, and shortcuts to record check-ups/receipts and view the assigned group. |
| **Community** (`/community`) | Read-only | View assigned school/group community structure and related batches. No community structure changes. |
| **Beneficiary** (`/beneficiary`) | Limited | View beneficiaries in the assigned group and perform only permitted profile updates. No creating or deleting beneficiary records. |
| **Monitor** (`/monitoring`) | Limited write | Review assigned-group monitoring history and record permitted maternal/child check-ups and associated documents. Individual requests are validated against scope. |
| **Program** (`/program`) | Limited write | View programs available to the assigned group and record permitted beneficiary receipt/check-in activity. Cannot create or manage program definitions or change their scopes. |
| **Progress Report** (`/progress-report`) | Read and export | Review and export data restricted to the assigned school/group. Export actions are audited. |
| **Notifications** (`/notifications`) | Available | View notifications available to the assigned school/group scope, including applicable Monitoring/Beneficiary notifications; update read state and supported preferences. |
| **Profile** (`/profile`) | Available | View the signed-in Health Worker's own account details. |
| **Settings** (`/settings`) | Available | Change the signed-in account's password and adjust local appearance preferences. |
| **User Management** (`/user-management`) | **Not available** | Health Workers cannot manage any user accounts. |
| **System activity Reports** (`/reports`) | **Not available** | System activity reporting is restricted to Superadmin, with a separate managed-worker activity endpoint for Community Organizers. |

## Scope and permissions

### Assigned-school and group perimeter

- `school_id` is required for operational access; the general middleware denies a Health Worker without a school assignment.
- `group_id` further restricts group-level beneficiary, community, and program workflows.
- Read/list/detail APIs must apply the school and group scope; write endpoints check that the target record and related entities are in scope.
- Program receipt/check-in operations require a group assignment and a program that covers the assigned group.
- A Community Organizer manages all applicable groups within one school. A Health Worker operates only within the assigned group.

### Permitted work

Within the assigned scope, the API permits specific writes, including:

- recording permitted maternal and child check-ups
- uploading permitted documents
- making limited child profile updates and permitted mother-record updates
- recording program receipt/check-in activity for eligible assigned-group beneficiaries

The exact fields and actions vary by endpoint and are validated server-side. Health Workers cannot create or delete beneficiary records, create/edit/end/delete programs, change community structures, administer accounts, or perform unrestricted writes.

### Boundaries from other roles

| Role | Relationship to Health Worker |
|---|---|
| **Superadmin** | Global account and community administration; no access to Program, Beneficiary, Monitoring, or Progress Report modules. |
| **Admin** | Global read-only operational oversight; no operational writes or user administration. |
| **Community Organizer** | Manages operations across an assigned school and administers Health Worker accounts in that school. |
| **Partner** | Global read-only operational review; no operational writes or user administration. |

## Dashboard, notifications, and reporting

- Dashboard figures use assigned-group operational data and expose follow-up/program indicators relevant to Health Worker tasks.
- Dashboard shortcuts include recording receipt check-ins, recording check-ups when permitted, and opening the assigned group.
- Notifications are scoped by school and, where applicable, group. Health Worker preferences are limited to supported categories such as Monitoring and Beneficiaries.
- Progress Report data/options are restricted to the Health Worker's school/group scope; exports are audited.
- Health Workers do not have access to the global system activity Reports page.

## Account assignment and lifecycle

- A Health Worker account requires both a school and a group assignment.
- The assigned group must belong to the assigned school.
- A Community Organizer can create, update, suspend, or reactivate Health Workers only in that organizer's assigned school. Superadmin can manage accounts globally.
- Health Workers cannot change their own role or assignment through User Management.
- Suspended accounts cannot complete normal sign-in; suspension/reactivation is distinct from permanent account deletion.

## Safe operating practices

1. Confirm your assigned school and group with your Community Organizer before entering records.
2. Select the correct beneficiary and program before recording a check-up or receipt; verify the save result.
3. Do not record activity for a beneficiary or program outside your assigned group.
4. Treat beneficiary and health information as sensitive; do not include unnecessary personal details in notes or exports.
5. Use Progress Report only for authorized work and follow local rules for report downloads and sharing.
6. Report missing or incorrect assignments to your Community Organizer; do not attempt to bypass scope restrictions through URL or API changes.
7. Protect your account credentials and sign out on shared devices.

## Sample accounts

The synthetic seed creates one sample Health Worker for each demo group. Accounts use the configured `SAMPLE_USER_PASSWORD`; they are local/demo accounts, not production credentials. See [server sample-data instructions](../server/README.md#synthetic-sample-data). Do not use sample credentials in a production deployment.

## Implementation references

- [Frontend route access](../src/App.jsx)
- [Role normalization and permission metadata](../src/utils/permissions.js)
- [Role-specific sidebar](../src/components/Sidebar.jsx)
- [School/group scope and permitted writes](../server/middleware/authorize.js)
- [Community API](../server/routes/community.js)
- [Beneficiary API](../server/routes/mothers.js)
- [Child records and check-ups API](../server/routes/children.js)
- [Program and receipt/check-in API](../server/routes/programs.js)
- [Progress Report API](../server/routes/progressReport.js)
- [Health Worker notification scope](../server/services/notificationAccess.js)
- [Dashboard behavior](../src/pages/Dashboard/DashboardPage.jsx)
- [Role access matrix](./ROLES_AND_ACCESS.md)
