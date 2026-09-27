# User Review Functionalities and Access Scope

## Overview

This review documents how each user type is recognized, how the app connects to the backend, and what scope each role is allowed to access. The source of truth for the current access model is in [src/utils/permissions.js](src/utils/permissions.js), [server/middleware/authorize.js](server/middleware/authorize.js), [server/routes/auth.js](server/routes/auth.js), and [src/App.jsx](src/App.jsx).

---

## 1. Active Role Model

The application currently has three normalized roles:

| Role name in code | Normalized value | Common display labels | Current scope |
|---|---|---|---|
| Super Admin | `super_admin` | Superadmin, Super Admin | Full application access, including user management |
| Admin | `admin` | Administrator, Admin | Access to admin resources and operational editing workflow |
| Partner | `partner` | Community Organizer, Health Worker, Partner | Scoped operational access based on assignment |

The normalization logic is defined in [src/utils/permissions.js](src/utils/permissions.js). The app converts labels such as `Superadmin`, `Administrator`, `Community Organizer`, and `Health worker` into the canonical internal role values before checking permissions.

### Permission rules

The current permission matrix is:

- `user-management`: read/create/update/delete allowed only for `super_admin`
- `admin-resources`: read/create/update/delete allowed for `super_admin` and `admin`
- `partner-resources`: read/create/update/delete allowed for `super_admin`, `admin`, and `partner`

This logic is defined in [src/utils/permissions.js](src/utils/permissions.js).

---

## 2. Connectivity and Request Flow

### Authentication path

1. Login is handled in [server/routes/auth.js](server/routes/auth.js).
2. The backend validates the user against the `users` table and checks `status` before issuing tokens.
3. JWT access tokens are generated with the user payload containing:
   - `id`
   - `role`
   - `email`
   - `school_id`
   - `group_id`
4. The front end stores and refreshes the session in [src/auth/AuthProvider.jsx](src/auth/AuthProvider.jsx).
5. Protected routes are wrapped by the route guards in [src/App.jsx](src/App.jsx) and [src/components/RoleBasedRoute.jsx](src/components/RoleBasedRoute.jsx).

### Backend authorization path

The API entry point is [server/index.js](server/index.js). All protected APIs are mounted behind `verifyToken` and, depending on the feature, `authorizeOperational`.

The key rule is:

- `super_admin` bypasses school/group assignment restrictions.
- `partner` accounts must be assigned to a `school_id`.
- `health worker` accounts also require a valid `group_id`.

This is enforced in [server/middleware/authorize.js](server/middleware/authorize.js).

### Database connectivity basis

The backend connects to MySQL with the settings defined in [server/db.js](server/db.js). The app relies on the `users` table and stores the access-critical fields:

- `role`
- `status`
- `school_id`
- `group_id`
- `password_hash`

User management endpoints are in [server/routes/users.js](server/routes/users.js), and those routes are restricted to `super_admin` in the current implementation.

---

## 3. User-by-User Functional Review

### A. Super Admin

#### Functional scope

- Full access to user management and account administration
- Can create, edit, suspend, and delete users through [src/pages/UserManagement/UserManagementPage.jsx](src/pages/UserManagement/UserManagementPage.jsx)
- Full visibility across the application, including operational modules and dashboard summaries
- Can access all routes explicitly guarded as `super_admin` in [src/App.jsx](src/App.jsx)

#### Route protections

Routes explicitly restricted to `super_admin` include:

- `/user-management`
- `/user-management/user/:id`

#### Operational behavior

- `super_admin` is treated as global and not limited by school or group assignment.
- This is enforced in [server/middleware/authorize.js](server/middleware/authorize.js).

#### Data scope

- Full application scope: all communities, schools, groups, mothers, children, programs, and reports.
- Super admin can also manage the account layer itself through [server/routes/users.js](server/routes/users.js).

---

### B. Admin

#### Functional scope

- Has access to admin-level resources and operational records
- Can create, update, or delete admin-resources according to the permission matrix in [src/utils/permissions.js](src/utils/permissions.js)
- Can perform business operations that are not restricted to the super-admin-only user-management area

#### Route-level reality

Most application route guards allow `admin` alongside `super_admin` and `partner` in beneficiary-related workflows, such as:

- create mother
- create child
- edit mother
- edit child

This is defined in [src/App.jsx](src/App.jsx).

#### Operational behavior

- Admin users are recognized as `admin` in the codebase, but they are not treated as global users for the user-management feature.
- They are expected to work within application-level operational access rather than account ownership control.

#### Data scope

- Broad operational access, but not global user administration.
- Usually bounded by assigned or operational context rather than the full global system scope.

---

### C. Partner

#### Functional scope

The `partner` role is the broad grouping used for:

- `community organizer`
- `health worker`
- `partner`

This is normalized in [src/utils/permissions.js](src/utils/permissions.js).

#### Route-level reality

Partner users are allowed into beneficiary and operational workflows along with super-admin and admin when those routes are guarded as shared modules.

Examples:

- create mother
- create child
- edit child
- edit mother

See [src/App.jsx](src/App.jsx).

#### Operational scope rules

The backend enforces assignment-based access for partner roles:

- `school_id` is required for partner users
- `health worker` also requires `group_id`
- if a partner user is not assigned, the API denies access via `authorizeOperational`

This is enforced in [server/middleware/authorize.js](server/middleware/authorize.js).

#### Data scope

- Scoped to assigned operational functions
- Not allowed to manage the global user list or super-admin-only account operations
- Can work within the assigned school/group context rather than across the entire platform

---

## 4. Scope Summary by Feature

| Module | Super Admin | Admin | Partner |
|---|---|---|---|
| User Management | Yes | No | No |
| Beneficiary creation/editing | Yes | Yes | Yes |
| Community and school operational access | Yes | Yes (operational) | Yes (if assigned) |
| Program access | Yes | Yes (if allowed by operational context) | Yes (if assigned) |
| Global account/role ownership | Yes | No | No |
| Access requiring school assignment | Not required | Not required by the role alias alone | Required |
| Access requiring group assignment | Not required | Not required by the role alias alone | Required for Health Worker |

---

## 5. Practical Review Findings

### What is working cleanly

- The role model is straightforward and centralized in [src/utils/permissions.js](src/utils/permissions.js).
- The backend enforces the main account access gate in [server/middleware/authorize.js](server/middleware/authorize.js).
- Front-end route restrictions match the intended super-admin-only user area in [src/App.jsx](src/App.jsx).

### Important scope notes

1. The app does not currently maintain a separate RBAC table in the live database for application access. The effective access is primarily based on the `role`, `school_id`, `group_id`, and `status` fields in the `users` table.
2. The `partner` role is used as a shared bucket for community-organizer and health-worker operations. This means the business rules depend on assignment fields rather than a richer role hierarchy.
3. The system currently treats `user-management` as a super-admin-only feature, even though some other admin-like permissions exist in the role matrix.

---

## 6. Formal Audit Table

| Module | Role Access | Scope | Risk | Recommendation |
|---|---|---|---|---|
| Community Management | Super Admin: full access. Admin: operational access depending on resources and role mapping. Partner: assigned school-level access; Community Organizer is treated as `partner`. Health Worker: read-only access in backend and limited assigned-group view in UI. | [server/routes/community.js](server/routes/community.js), [server/middleware/authorize.js](server/middleware/authorize.js), [src/pages/Community/CommunityPage.jsx](src/pages/Community/CommunityPage.jsx) | Medium. Health workers can read assigned data but not edit, which is good, but the role is still aggregated under `partner`, making behavior depend on assignment fields rather than a richer role model. | Keep the school/group assignment logic, but consider separating Community Organizer and Health Worker into distinct internal roles if future workflows diverge sharply. |
| Monitoring | Super Admin: full. Admin: operational access. Partner: assigned cases only; health workers are filtered by `group_id` in the UI and backend. | [src/pages/Monitoring/MonitoringPage.jsx](src/pages/Monitoring/MonitoringPage.jsx), [server/middleware/authorize.js](server/middleware/authorize.js) | Low to Medium. The monitoring view is tightly scoped, which is appropriate for field operations, but it relies on `group_id` and could fail silently if assignment data is stale. | Maintain validation checks for assigned group membership and surface warnings when the user has no active group assignment. |
| Beneficiaries | Super Admin: full. Admin: can access shared beneficiary workflows. Partner: can access beneficiary workflows within assigned scope. Health Worker: can view/edit assigned beneficiary records but cannot create the main beneficiary record from the UI. | [src/pages/Beneficiary/BeneficiaryPage.jsx](src/pages/Beneficiary/BeneficiaryPage.jsx), [src/App.jsx](src/App.jsx), [src/utils/permissions.js](src/utils/permissions.js) | Low. The role gating is mostly sensible, but the system still treats Health Worker and Community Organizer as the same broader `partner` bucket. | Keep read/write separation by assignment, and consider explicit UI messaging clarifying that health workers are assigned-case actors, not record creators. |
| Programs | Super Admin: full. Admin: operational program oversight. Partner: assigned school/group program access. Health Worker: read-only access enforced in [server/routes/programs.js](server/routes/programs.js). | [server/routes/programs.js](server/routes/programs.js), [src/pages/Program/ProgramPage.jsx](src/pages/Program/ProgramPage.jsx), [server/middleware/authorize.js](server/middleware/authorize.js) | Medium. Program data is scoped, but the implementation depends on matching names and assigned cluster relationships; this may be brittle if community/group naming changes. | Add stricter validation on cluster-to-school/group matching and avoid relying only on names when IDs are available. |
| Progress Reports | Super Admin: full. Admin: operational reporting access. Partner: assigned school/group reporting access. Health Worker: generally limited to reporting on assigned cases and view-only usage. | [src/pages/ProgressReport/ProgressReport.jsx](src/pages/ProgressReport/ProgressReport.jsx), [server/index.js](server/index.js) | Low. Reports are scoped and descriptive, which is a good fit for operational use. | Keep reporting filtered by assigned school/group context and document the intended audience for each report type. |
| User Management | Super Admin: full create, list, edit, suspend, delete. Admin: no access to account ownership or user list. Partner: no access. | [src/App.jsx](src/App.jsx), [server/routes/users.js](server/routes/users.js), [src/pages/UserManagement/UserManagementPage.jsx](src/pages/UserManagement/UserManagementPage.jsx) | Low for the intended design, but High if account ownership is later expanded without clear controls. The current implementation is strict and centralized, which is positive. | Keep user management restricted to super admin, and document this as the sole account governance role. |
| Dashboard | Super Admin: sees all modules including users. Admin: sees operational modules and summary views. Partner: sees operational dashboard content filtered by assignment. Health Worker: sees assigned operational summary, but no user-management controls. | [src/pages/Dashboard/DashboardPage.jsx](src/pages/Dashboard/DashboardPage.jsx), [src/utils/permissions.js](src/utils/permissions.js) | Low. The dashboard acts as a summary layer rather than a security boundary, which is correct. | Continue using the dashboard as a contextual landing page rather than a source of authority for permissions. |

---

## 7. Role Audit Summary

| Role | Current Internal Classification | Primary Access | Scope | Risk |
|---|---|---|---|---|
| Super Admin | `super_admin` | Full application access including user management | Global | Low, by design |
| Admin | `admin` | Operational and admin-resource access | Broad operational scope, not global user ownership | Low to Medium |
| Partner | `partner` | Shared operational access for Community Organizer and Health Worker | Assigned school/group scope | Medium |
| Community Organizer | normalized to `partner` | School-scoped operational access | Assigned school | Medium |
| Health Worker | normalized to `partner` | Assigned operational monitoring and read-only management | Assigned school + group | Medium |

---

## 8. Conclusion

The application currently implements a role model with a clear control boundary:

- `super_admin` remains the only user-management authority.
- `admin` is an operational management role, but not a global account-ownership role.
- `partner` acts as the shared operational bucket for Community Organizer and Health Worker workers, with assignment constraints controlling visibility.

This design is operationally coherent and simple to maintain, but the `partner` bucket is broad enough that future role differentiation may become necessary if coordinator and health-worker workflows continue to diverge.
