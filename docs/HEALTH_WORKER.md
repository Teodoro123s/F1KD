# Health Worker Guide

This guide describes the Health Worker role as currently implemented in F1KD: its purpose, modules, assigned-school/group scope, permitted operational tasks, and related API behavior.

## Role summary

The canonical role value is `health_worker`. The interface commonly labels this role **Health Worker**; `Health worker`, `healthworker`, and `health_worker` are normalized to the same role.

A Health Worker performs assigned-group beneficiary and project tasks, especially recording check-ups and project receipts. The role has the narrowest operational scope: an account must be assigned to both a school and a group, and group-level work is limited to that group.

The token's `school_id` and `group_id` form the role's perimeter. A route parameter or submitted school/group ID cannot expand that perimeter. Operational access is denied when either assignment is missing; project receipt/check-in tasks also require a valid project that covers the assigned group.

## Modules and components available

The Health Worker sidebar contains Dashboard, Community, Beneficiary, Monitor, Projects, Progress Report, and Notifications. Profile and Settings are also available from the account menu. User Management is not shown and is not available. The Projects module retains the `/program` route and legacy `programs` API identifiers for compatibility.

| Module or component | Availability | Purpose and limits |
|---|---|---|
| **Dashboard** (`/dashboard`) | Available | Assigned-group overview with follow-up and assigned-project indicators, and shortcuts to record check-ups/receipts and view the assigned group. |
| **Community** (`/community`) | Read-only | View assigned school/group community structure and related batches. No community structure changes. |
| **Beneficiary** (`/beneficiary`) | Limited | View beneficiaries in the assigned group and perform only permitted profile updates. No creating or deleting beneficiary records. |
| **Monitor** (`/monitoring`) | Limited write | Review assigned-group monitoring history and record permitted maternal/child check-ups and associated documents. Individual requests are validated against scope. |
| **Projects** (`/program`) | Limited write | View projects available to the assigned group and record permitted beneficiary receipt/check-in activity. Cannot create or manage project definitions or change their scopes. |
| **Progress Report** (`/progress-report`) | Read and export | Review and export data restricted to the assigned school/group. Export actions are audited. |
| **Notifications** (`/notifications`) | Available | View notifications available to the assigned school/group scope, including applicable Monitoring/Beneficiary notifications; update read state and supported preferences. |
| **Profile** (`/profile`) | Available | View the signed-in Health Worker's own account details. |
| **Settings** (`/settings`) | Available | Change the signed-in account's password and adjust local appearance preferences. |
| **User Management** (`/user-management`) | **Not available** | Health Workers cannot manage any user accounts. |
| **System activity Reports** (`/reports`) | **Not available** | System activity reporting is restricted to Superadmin, with a separate managed-worker activity endpoint for Community Organizers. |

## Scope and permissions

### Assigned-school and group perimeter

- `school_id` and `group_id` are both required for operational access; the general middleware denies a Health Worker missing either assignment.
- The assigned group must belong to the assigned school and restricts beneficiary, community, and project workflows.
- Read/list/detail APIs must apply the school and group scope; write endpoints check that the target record and related entities are in scope.
- Project receipt/check-in operations require a group assignment and a project that covers the assigned group.
- A Community Organizer manages all applicable groups within one school. A Health Worker operates only within the assigned group.

### Permitted work

Within the assigned scope, the API permits specific writes, including:

- recording permitted maternal and child check-ups
- uploading permitted documents
- making limited child profile updates and permitted mother-record updates
- recording project receipt/check-in activity for eligible assigned-group beneficiaries
- viewing and downloading project receipt/check-in photo documentation; only Community Organizers can upload or remove those photos

The exact fields and actions vary by endpoint and are validated server-side. Health Workers cannot create or delete beneficiary records, create/edit/end/delete projects, change community structures, administer accounts, or perform unrestricted writes.

### Boundaries from other roles

| Role | Relationship to Health Worker |
|---|---|
| **Superadmin** | Global account and community administration; no access to Projects, Beneficiary, Monitoring, or Progress Report modules. |
| **Admin** | Global read-only operational oversight; no operational writes or user administration. |
| **Community Organizer** | Manages operations across an assigned school and administers Health Worker accounts in that school. |
| **Partner** | Global read-only operational review; no operational writes or user administration. |

## Dashboard, notifications, and reporting

- Dashboard figures use assigned-group operational data and expose follow-up/project indicators relevant to Health Worker tasks.
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
2. Select the correct beneficiary and project before recording a check-up or receipt; verify the save result.
3. Do not record activity for a beneficiary or project outside your assigned group.
4. Treat beneficiary and health information as sensitive; do not include unnecessary personal details in notes or exports.
5. Use Progress Report only for authorized work and follow local rules for report downloads and sharing.
6. Report missing or incorrect assignments to your Community Organizer; do not attempt to bypass scope restrictions through URL or API changes.
7. Protect your account credentials and sign out on shared devices.

## Sample accounts


## Implementation references

- [Frontend route access](../src/App.jsx)
- [Role normalization and permission metadata](../src/utils/permissions.js)
- [Role-specific sidebar](../src/components/Sidebar.jsx)
- [School/group scope and permitted writes](../server/middleware/authorize.js)
- [Community API](../server/routes/community.js)
- [Beneficiary API](../server/routes/mothers.js)
- [Child records and check-ups API](../server/routes/children.js)
- [Projects and receipt/check-in API (legacy `programs` identifiers)](../server/routes/programs.js)
- [Progress Report API](../server/routes/progressReport.js)
- [Health Worker notification scope](../server/services/notificationAccess.js)
- [Dashboard behavior](../src/pages/Dashboard/DashboardPage.jsx)
- [Role access matrix](./ROLES_AND_ACCESS.md)
