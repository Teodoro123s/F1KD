# Superadmin User Guide

## Overview

The Superadmin is the highest-privilege account in the F1KD application. It is designed to serve as the system-level administrator for user management, emergency recovery, cross-school oversight, and overall operational control.

Across the codebase, the role is normalized to the canonical value `super_admin`, while the app also accepts common aliases such as `superadmin` and `super admin`.

Relevant implementation points:
- `server/middleware/auth.js` — normalizes role aliases and enforces role checks
- `server/middleware/authorize.js` — grants or denies access based on the user role
- `server/services/superadminRecovery.js` — self-heals the default Superadmin account
- `src/utils/permissions.js` — frontend permission map for the role hierarchy

## Purpose

The Superadmin exists to:
- manage the platform at a global level rather than a single school or group
- create and control high-level administrator and operational user accounts
- maintain emergency recovery access if the normal admin flow is unavailable
- review system-wide activity and user status across the entire deployment
- act as the final authority for user lifecycle management and role assignment

Unlike scoped roles such as Community Coordinator or Health Worker, the Superadmin is not limited to a single school or group. It has unrestricted access throughout the application in the server-side authorization flow.

## Default account behavior

The app can automatically recreate a default Superadmin user if the account is missing from the database.

Current defaults defined in the server code:
- Email: `Superadmin@gmail.com`
- Password: `Welcome123!`

This is enforced by `ensureSuperadminAccount()` in `server/services/superadminRecovery.js`, which:
1. checks whether the Superadmin row exists
2. creates one if it is missing
3. restores the role to a Superadmin value when the stored role is malformed
4. reactivates the account if it has no status
5. regenerates credentials only if the project is configured to allow self-healing credentials

This behavior makes the account resilient during initial setup and recovery scenarios, while still preserving the expectation that a real administrator should replace it with a properly managed account in production.

## Role model and permission boundary

The role hierarchy in the application is:
- `super_admin` — platform-level administrator
- `admin`
- `community_coordinator`
- `partner`
- `health_worker`

The canonical Superadmin role is defined in:
- `src/utils/permissions.js`
- `server/middleware/auth.js`
- `server/middleware/authorize.js`

The authorization rules show that:
- Superadmin is accepted for all privileged operations
- user-management writes are restricted to Superadmin in operational middleware
- Superadmin is treated as a global operator with no school scoping
- some operational routes are intentionally read-only for other roles and only writable for designated staff

In practical terms, the Superadmin is the only role that can operate above the school/group boundary and manage user access across the system.

## Modules and responsibilities

### 1. Dashboard

The dashboard exposes a system-level summary view. For the Superadmin, this includes operational oversight across users, staff, assignments, and recent activity.

The frontend dashboard logic checks whether the current user is a Superadmin and adjusts the display to show cross-organization metrics and the special Superadmin card/grid layout.

Key files:
- `src/pages/Dashboard/DashboardPage.jsx`
- `src/styles/components/dashboard.css`

Responsibilities:
- review global user counts and staffing metrics
- monitor the activity of staff and assigned records
- see the global status of schools, staff, and unassigned users

### 2. User management

This is the Superadmin’s most important administrative surface.

The user management pages are restricted to Superadmin and, in limited cases, Community Coordinators. Superadmin can:
- create users
- edit user details
- update user status
- suspend or reactivate accounts
- manage permanent deletions
- assign or review global user records

The frontend code explicitly protects destructive actions:
- `Permanent deletion is reserved for Super Admins.`

Key files:
- `src/pages/UserManagement/UserManagementPage.jsx`
- `src/pages/UserManagement/useUserManagement.js`
- `server/routes/users.js`

### 3. Community and school management

The Superadmin can access community-wide structures without the school-scoped restrictions that apply to other roles.

This includes:
- system-wide schools and community resources
- group-level organization across the deployment
- cross-school oversight where school assignments are required elsewhere

Key files:
- `src/App.jsx`
- `src/pages/Community/CommunityModulePage.jsx`

### 4. Program and beneficiary operations

Although Superadmin is not the core role for daily operational data entry, the role still has access to core program and beneficiary resources as part of the broad administrative model.

This allows the Superadmin to:
- inspect program data across the system
- review beneficiary records and monitoring data
- support operational troubleshooting when higher-level oversight is required

### 5. Reports and activity tracking

The reporting module is intentionally designed to exclude Superadmin activity from standard user login totals and activity summaries.

The report route checks this explicitly in `server/routes/reports.js` by filtering out activity where:
- the actor role is a Superadmin
- or the actor record resolves to a Superadmin account

This prevents the Superadmin’s own authentication events from distorting the operational analytics used by school-focused reporting.

Responsibilities:
- review login activity across non-Superadmin users
- inspect school and group-level performance from the reporting layer
- assess account activity without polluting ordinary user reports

### 6. Recovery and integrity safeguards

The Superadmin role also acts as the platform recovery path.

The service layer checks whether the default Superadmin should be restored and ensures the account is active. This is essential in environments where:
- the database was reset
- the primary admin account is missing
- a deployment was freshly initialized
- a maintenance or migration issue removed the original system admin record

This is a security-sensitive capability: it is intentionally automated but should be controlled and monitored in production deployments.

## Core functions and capabilities

The Superadmin is responsible for the following functions:

- Account provisioning and lifecycle management
  - create user accounts
  - assign role-based access
  - suspend or reactivate users
  - manage system-wide access permissions

- Role governance
  - maintain platform-wide admin and operational role assignments
  - ensure role aliases are correctly normalized to `super_admin`

- Global record oversight
  - access community, beneficiary, and program data across the organization
  - review reports without being limited to a single school/group scope

- Recovery and resilience
  - restore the default Superadmin account if it disappears
  - keep account recovery operations available when the system is incomplete or newly established

- Activity monitoring
  - review user sign-in logs and operational reports
  - filter out Superadmin records so operational metrics remain meaningful

## Operational boundaries

The code makes a clear distinction between the Superadmin and other roles:

- Superadmin is not treated as a school-scoped or group-scoped user
- Community Coordinators and Health Workers are filtered by assignment
- Admins and Partners are operational roles but not system-wide administrators
- User-management writes are not allowed for non-Superadmin roles in the main operational middleware

In short:
- Superadmin = global authority
- Admin = operational authority within the app’s broader role set
- Community Coordinator / Health Worker / Partner = scoped operational roles with narrower permissions

## Practical guidance

If you are maintaining or extending the application:
- treat `super_admin` as the platform owner role
- keep account recovery logic protected and auditable
- avoid exposing Superadmin-only operations to non-admin users
- ensure reports and dashboard metrics remain separated from Superadmin internal activity
- use the default Superadmin account only for bootstrap and emergency access, not as a regular production account

## Related files

- `server/middleware/auth.js`
- `server/middleware/authorize.js`
- `server/services/superadminRecovery.js`
- `server/routes/auth.js`
- `server/routes/users.js`
- `server/routes/reports.js`
- `src/utils/permissions.js`
- `src/App.jsx`
- `src/pages/Dashboard/DashboardPage.jsx`
- `src/pages/UserManagement/useUserManagement.js`
