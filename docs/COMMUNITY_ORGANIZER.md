# Community Organizer Guide

This guide describes the Community Organizer role as currently implemented in F1KD: its purpose, modules, school scope, account-management limits, operational responsibilities, and related API behavior.

## Role summary

The canonical role value is `community_coordinator`. The interface commonly calls this role **Community Organizer**. The frontend and backend normalize Community Organizer, Community Coordinator, `community_coordinator`, `coordinator`, and `co` to the same role.

A Community Organizer coordinates operations for one assigned school. The role can manage school-level beneficiary and program workflows, community structures below the school level, and Health Worker accounts assigned to that school. It is not a global administrator role.

The assigned `school_id` is the role's perimeter. The API applies that scope to operational data; changing a route or URL does not grant access outside the assigned school. An account without a school assignment does not receive global access and is denied or given an empty school scope.

## Modules and components available

The Community Organizer sidebar contains Dashboard, Community, Beneficiary, Monitor, Program, Progress Report, User Management, and Notifications. Profile and Settings are also available from the account menu.

| Module or component | Availability | Purpose and limits |
|---|---|---|
| **Dashboard** (`/dashboard`) | Available | School-scoped operational overview, with beneficiary, check-up, community, program, and Health Worker indicators. It can show follow-ups and shortcuts to school workflows. It refreshes on demand and periodically. |
| **Community** (`/community`) | Available | View the assigned school, its groups and batches, and scoped community records. Manage groups and batches within the assigned school. Community Organizers cannot create or delete schools. |
| **Beneficiary** (`/beneficiary`) | Available | Register and manage mothers and children in the assigned school; review beneficiary profiles and related records. API scope prevents access to records outside the assigned school. |
| **Monitor** (`/monitoring`) | Available | Review and record permitted maternal and child check-ups for the assigned school. Individual records remain subject to school scope and endpoint validation. |
| **Program** (`/program`) | Available | Create and manage programs within the assigned school, configure program scopes, and review receipt/check-in activity. Mutations validate that program scopes belong to the organizer's school. |
| **Progress Report** (`/progress-report`) | Available | View and export progress reports using data/options scoped to the assigned school. Reports should not be treated as global data. |
| **User Management** (`/user-management`) | Limited | Create, view, edit, suspend, and reactivate Health Worker accounts in the assigned school. The workflow requires an assigned school; a Health Worker must also be assigned to a group in that same school. No permanent deletion or management of other roles is granted. |
| **Notifications** (`/notifications`) | Available | View notifications within the assigned school's scope, including applicable operational categories. User Management notifications are excluded from the coordinator's scope. |
| **Reports (system activity)** (`/api/reports/activity`) | Limited API access | A coordinator may request activity for one managed Health Worker by specifying that worker's user ID. The API verifies the worker belongs to the coordinator's school. The system Reports page and global reports are Superadmin-only. |
| **Profile** (`/profile`) | Available | View the signed-in user's own account details. |
| **Settings** (`/settings`) | Available | Change the signed-in account's password and adjust local appearance preferences. |
| **Global User Management** | **Not available** | The full `/api/users` endpoints are Superadmin-only. The coordinator-specific Health Worker routes are a separate, school-limited API. |
| **School administration** | **Not available** | Coordinators cannot create or delete school/community records. Those actions are reserved for Superadmin. |

## Scope and permissions

### Assigned-school perimeter

- The authenticated account's `school_id` determines the Community Organizer's operational scope.
- Community, beneficiary, child, monitoring, program, and report data are filtered or validated against that school.
- A coordinator without a valid school assignment is assigned an empty school scope for general operational routes; the Health Worker user-management and activity-report workflows explicitly require a valid school assignment.
- A coordinator cannot expand scope by submitting another school's ID in a request. Detail and mutation endpoints must still verify that the target record belongs to the assigned school.
- The role is school-scoped, not group-scoped: it can oversee groups and batches within its school. Health Workers are further limited to their assigned group.

### Community structure

Community Organizers can create and manage groups and batches that belong to their assigned school, but cannot create or delete school records. The API applies the school constraint to group/batch assignments and mutations.

### Beneficiary, monitoring, and program work

Within the assigned school, the role can:

- register and manage beneficiary profiles
- review maternal and child records and associated check-up history
- record and review permitted maternal/child check-ups
- create and manage programs and the groups/batches they cover
- review program receipt/check-in records
- view and export Progress Reports using the permitted school-scoped options and data

The role should use operational screens for these tasks; it does not gain global visibility over other schools.

### Health Worker account lifecycle

The coordinator-specific User Management workflow supports:

- listing Health Workers assigned to the coordinator's school
- creating a Health Worker account in that school and assigning a group that belongs to it
- editing permitted Health Worker account details and assignment
- suspending or reactivating a Health Worker account

It does not grant permission to administer Admin, Partner, Community Organizer, or Superadmin accounts; list users across all schools; permanently delete accounts; or use the general Superadmin `/api/users` administration endpoints. A coordinator account itself requires a school assignment.

Suspension is reversible; it prevents normal sign-in while in effect. It is distinct from permanent deletion, which is not available to Community Organizers.

### Boundaries from other roles

| Role | Relationship to Community Organizer |
|---|---|
| **Superadmin** | Global administration of users and school/community structure, plus system activity reporting. No Program, Beneficiary, Monitoring, or Progress Report access. |
| **Admin** | Global read-oriented operational oversight; operational writes and user administration are denied. |
| **Partner** | Global read-oriented operational review; no operational writes or user administration. |
| **Health Worker** | Executes assigned-group tasks, with a narrower school-and-group perimeter; may record permitted check-ups and program receipts but does not manage school operations or user accounts. |

## Dashboard, notifications, and reporting

- The dashboard reads operational data through school-scoped APIs and presents the assigned school's current totals, including beneficiaries, communities/groups/batches, programs, monitoring indicators, and managed Health Workers.
- Dashboard data refreshes on demand and on its periodic refresh interval. Failed data sources are surfaced as incomplete dashboard data rather than being treated as verified zeroes.
- Notifications are constrained to the coordinator's assigned school; User Management category notifications are excluded.
- System activity reporting is not a general coordinator module. The activity API permits a coordinator to request records for a managed Health Worker only, and validates the worker's school assignment.
- Progress Report is a separate operational report module. Its options and records are filtered to the assigned school.

## Safe operating practices

1. Confirm the organizer account is Active and assigned to the correct school.
2. Assign each Health Worker to a group that belongs to that same school.
3. Review school and group assignment before creating or changing beneficiaries, batches, or program scopes.
4. Use the Health Worker management workflow only for workers in the assigned school; Superadmin handles other account roles and permanent deletion.
5. Treat reports, dashboard totals, exports, and notifications as school-scoped operational information.
6. When testing access, check both a record within the assigned school and a record from another school; the latter must be filtered or denied by the API.
7. Do not rely on hidden navigation or disabled UI controls as the security boundary; verify server-side authorization and scope checks.

## Sample accounts

The synthetic sample-data seed creates Community Organizer accounts for its demo schools. Their logins use the configured `SAMPLE_USER_PASSWORD`; the seed does not define a production account or production password. See [server sample-data instructions](../server/README.md#synthetic-sample-data) for setup and test-account details. Do not use sample credentials in a production deployment.

## Implementation references

- [Frontend route access](../src/App.jsx)
- [Role normalization and permission metadata](../src/utils/permissions.js)
- [Role-specific sidebar](../src/components/Sidebar.jsx)
- [School/group scope and write authorization](../server/middleware/authorize.js)
- [Community data and school structure API](../server/routes/community.js)
- [Beneficiary API and school scope](../server/routes/mothers.js)
- [Child records and check-ups API](../server/routes/children.js)
- [Program and scope validation API](../server/routes/programs.js)
- [Coordinator Health Worker account endpoints](../server/routes/users.js)
- [Coordinator activity-report restrictions](../server/routes/reports.js)
- [School-scoped notification access](../server/services/notificationAccess.js)
- [Dashboard data and role behavior](../src/pages/Dashboard/DashboardPage.jsx)
- [Role access matrix](./ROLES_AND_ACCESS.md)
