# Users, Roles, Permissions, and Data Scope

This guide describes the access model currently implemented in F1KD. It is intended for administrators, operators, testers, and developers.

The user-facing module is named **Projects**. Its `/program` route and `programs` API/database identifiers are retained for compatibility.

## Identity and enforcement

- A user signs in with an account email and password. The server issues an authenticated token containing the user's role and any school/group assignments.
- The application uses five canonical roles: `super_admin`, `admin`, `community_coordinator`, `partner`, and `health_worker`.
- The frontend uses route guards and permission helpers to shape navigation and hide actions. These improve the user experience but are not the security boundary.
- The API is authoritative: protected requests verify the token, check the role, apply school/group scope, and reject disallowed writes.
- Role aliases are normalized in the frontend and backend authorization middleware. Currently recognized aliases include `Super Admin`/`superadmin`, `Administrator`, `Community Organizer`/`Community Coordinator`/`coordinator`/`co`, `Partner`, and `Health Worker`. The role is normalized in multiple files; when aliases change, keep those mappings and relevant tests in sync.

## Role overview

| Role | Intended responsibility | Data scope |
|---|---|---|
| **Superadmin** (`super_admin`) | Platform-wide user administration, school/community oversight, and system activity reports. | Global for the modules it can access. Has no access to Projects, Beneficiaries, Monitoring, or Progress Report. |
| **Admin** (`admin`) | Operational oversight and review. | Global read scope for operational data; operational resources are read-only. |
| **Community Coordinator** (`community_coordinator`) | Run operations for an assigned school, including beneficiary and project workflows and local health-worker account management. | Limited to the assigned school. |
| **Partner** (`partner`) | Review operational activity across the deployment. | Global read scope for operational data; operational resources are read-only. |
| **Health Worker** (`health_worker`) | Perform assigned-group beneficiary and check-up tasks and record project receipts. | Limited to the assigned school and group. |

## Module access matrix

“Read” includes viewing the module and its records. “Manage” means the role has at least one applicable write action; record scope and specific operation limits still apply.

| Module | Superadmin | Admin | Community Coordinator | Partner | Health Worker |
|---|---|---|---|---|---|
| Dashboard | Global admin overview | Operational overview | Assigned-school overview | Operational overview | Assigned-group overview |
| Community (schools, groups, batches) | Read and manage global school structure | Read-only | Read and manage within assigned school; cannot create or delete schools | Read-only | Read-only; views are limited to assigned school/group |
| Beneficiaries | No access | Read-only | Register and manage records within assigned school | Read-only | Read and perform limited record updates within assigned group |
| Monitoring / check-ups | No access | Read-only | Record and review check-ups within assigned school | Read-only | Record and review check-ups within assigned group |
| Projects and receipt check-ins | **No access** | Read-only | Create/manage school-scoped projects and receipt scopes | Read-only | View assigned projects and record receipts for assigned group |
| Progress Report | No access | Read and export | Read and export within assigned-school scope | Read and export | Read and export within assigned-group scope |
| User Management | Manage user accounts across the system | No access to user administration | Manage Health Worker accounts in assigned school only | No access to user administration | No access to user administration |
| Reports (system activity) | Read global reports | No access | Activity report access is available through the API; not a standard sidebar module | No access | No access |
| Notifications | Global administration-related categories | Global operational notifications | Assigned-school notifications | Global operational notifications | Assigned-school/group notifications |
| Profile and Settings | Own account | Own account | Own account | Own account | Own account |

The application may provide more detailed restrictions than this summary. For example, Community Coordinators cannot create or delete schools, Health Workers cannot create projects or change community structures, and Admin/Partner operational writes are denied by the API. Download-audit events for Progress Report exports are recorded for all roles allowed to export.

For project receipt/check-in photo documentation, Community Coordinators can upload and remove photos; Admin, Partner, and Health Worker accounts can view and download them only. Superadmins have no Projects access.

## Data scope rules

### Global roles

- **Superadmin** receives no school or group restriction in the general operational middleware, but explicit module-level denials take precedence. In particular, the Projects API denies Superadmin requests, matching the frontend route and sidebar restrictions.
- **Admin** and **Partner** have global read scope for operational modules. Their operational data writes are denied; notification preferences/read-state actions and permitted report-download auditing are separate account-level actions.

### Assigned-school role: Community Coordinator

- The token's `school_id` determines the coordinator's school scope.
- List and detail APIs must apply that scope to community, beneficiary, project, and report data.
- A coordinator without a school assignment receives an empty community scope rather than global access.
- Coordinators can manage Health Worker accounts only in their assigned school. A Health Worker must be assigned to a group belonging to that same school.
- Coordinators may create and manage school structures below school level, but cannot create or delete schools.
- Project mutations check that the project and its assigned scopes belong to the coordinator's school.

### Assigned-group role: Health Worker

- The token's `school_id` and `group_id` determine the Health Worker's scope.
- A Health Worker without a school assignment is denied operational access. Project receipt/check-in actions also require a group assignment.
- Community structures and project definitions are read-only. The Health Worker can write permitted check-ups/documents and child-profile updates, and can record project receipts only for beneficiaries in the assigned group and projects that cover that group.
- Report filter options and records are constrained by the assigned school/group.

## User administration and account lifecycle

- Superadmins can create, view, update, suspend/reactivate, and permanently delete user accounts through User Management.
- Community Coordinators can create, view, update, and suspend/reactivate Health Worker accounts in their own school. They cannot administer other roles or other schools' workers.
- A Community Coordinator account requires a school assignment.
- A Health Worker account requires both a school and a group assignment; the selected group must belong to the selected school.
- Accounts have `Active` or `Suspended` status. Suspension/reactivation is distinct from permanent deletion.
- Passwords are stored as hashes. The seed password is supplied through `SAMPLE_USER_PASSWORD`; the repeatable demo seed does not create a Superadmin account.
- Demo seed accounts are test data only. See [Synthetic sample data](../server/README.md#synthetic-sample-data) for the account list and setup instructions. Do not use shared demo credentials in a production deployment.

## Practical access checks

1. Check the user's canonical role, active status, `school_id`, and (for Health Workers) `group_id`.
2. Confirm the user can see only the expected modules in the sidebar.
3. Test both an allowed UI workflow and a direct API request. A hidden button alone does not prove that the API is protected.
4. For scoped roles, test a record in the assigned school/group and one outside it; the outside request must be filtered or denied.
5. When changing role rules, update the frontend route/navigation rules, API authorization, this guide, and the targeted tests together.

## Source files

- [Frontend routes](../src/App.jsx)
- [Frontend permission metadata and role aliases](../src/utils/permissions.js)
- [Role-aware navigation](../src/components/Sidebar.jsx)
- [Backend operational authorization](../server/middleware/authorize.js)
- [User-management endpoints](../server/routes/users.js)
- [Projects API and scope enforcement (legacy `programs` identifiers)](../server/routes/programs.js)
- [Progress Report API](../server/routes/progressReport.js)
- [Repeatable sample users and data](../server/scripts/seed_sample_data.js)
