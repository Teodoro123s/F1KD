# F1KD Modules and User Workflows Audit

**Reviewed:** 2026-10-21

The user-facing module label is **Projects**. The `/program` route and `programs` API/database identifiers are retained for compatibility.

## Summary

The main workflows generally match their intended users: coordinators manage school operations, health workers perform assigned-group beneficiary and monitoring tasks, and administrators have read-oriented operational oversight. Superadmins have no access to the Projects module, beneficiary workflows, monitoring, or Progress Report.

This is not evidence that every role can complete every workflow end to end. Role authorization, project scope, and child monitoring persistence have focused automated coverage; representative browser workflows for every role remain unverified.

## Roles and module access

Access below reflects the current route and API design. Record-level restrictions still apply within a module.

| Role | Intended module access and responsibilities |
|---|---|
| **Superadmin** | Global dashboard, community oversight, user administration, system activity reports, and notifications. Projects, beneficiary, monitoring, and Progress Report modules are not accessible. |
| **Admin** | Operational dashboard and read-oriented access to community, beneficiaries, monitoring, projects, Progress Report, and notifications. |
| **Community Coordinator** | School-level operations: community structures, beneficiary records, monitoring, projects and recipient scopes, Progress Reports, and limited health-worker account management. |
| **Partner** | Operational dashboard and read-oriented access to community, beneficiaries, monitoring, projects, Progress Report, and notifications. |
| **Health Worker** | Assigned-school/group beneficiary and monitoring work, project receipt history/check-ins, Progress Reports, and scoped notifications. Does not manage community structures, projects, or user accounts. |

Authenticated users can also access their profile and settings routes. See [App.jsx](../src/App.jsx), [permissions.js](../src/utils/permissions.js), and [authorize.js](../server/middleware/authorize.js).

## Module purpose and current assessment

| Module | Purpose and role fit | Assessment |
|---|---|---|
| **Sign-in and account recovery** | Authenticate users and provide account/password recovery. Role identity is normalized before authorization. | Core authentication and recovery paths have targeted tests; not exercised for every role in this review. |
| **Dashboard** | Give users a role-appropriate operational overview and shortcuts to their work. Superadmin gets broader oversight. | Dashboard supports different role contexts and loads independent data sections resiliently. The signed-in coordinator dashboard rendered in the smoke check. No dedicated dashboard workflow tests were found in the reviewed set. |
| **Community** | Organize schools, groups, and batches. Coordinators maintain school structures; health workers are read-only. | Create-menu and school/group scope behavior have documented and automated coverage. Coordinators cannot create or delete schools. |
| **Beneficiary** | Register and maintain mother and child records, then view their profiles and linked information. | Coordinator intake and health-worker limited updates fit the role split; Admin and Partner are read-only. Mother registration and monitoring persistence have focused API coverage. |
| **Monitoring** | Record and review beneficiary checkups and child measurements for follow-up. | Coordinator and health-worker write paths are scoped; Admin and Partner are read-only. Health-worker views are group-scoped. Child check-up persistence, group denial, and notification recording have a route integration test; mother check-up persistence also has focused coverage. |
| **Projects** | Define projects, assign school/group/batch coverage, automatically include eligible recipients, and record dated receipt check-ins. | Coordinators manage school-scoped projects and health workers record receipts. Superadmins are denied by both frontend routes and the API. Coordinator cross-school mutation denial has a focused API test. |
| **Progress Report** | Filter by school/group/batch, review progress and growth measures, and export results. | Operational roles can use the report flow, with assigned-school/group filters and server-derived scope. Export audit events are enabled for every role allowed to export. |
| **User Management** | Let Superadmins administer accounts and coordinators manage health workers assigned to their school. | Coordinator health-worker lifecycle management and school containment have targeted route tests. Permission metadata reflects coordinator read/create/update access while reserving permanent deletion to Superadmins. |
| **Reports** | Let Superadmins review operational sign-in activity across users and schools. | Superadmin-only route; report excludes Superadmin activity from ordinary operational login totals. |
| **Notifications** | Give users role- and assignment-scoped operational updates. | Server filters by role, school/group, and recipient; read state is per-user and visibility is checked before marking read. Notifications with a valid destination navigate to the related record. |
| **Profile and Settings** | Show account and assignment details, allow password change, and store an appearance preference. | Available to authenticated users; profile fields are read-only, and dark mode is stored locally. These routes received code inspection but not a full save/password-change browser test. |

## Remaining verification

- Disallowed frontend routes redirect to Community without explaining that access was denied.
- Not every role has been browser-tested through representative create/edit/save workflows. Check-up route tests use a mocked database pool rather than a persistent test database.
- Notification destinations navigate to their related records. Superadmin module exclusions, coordinator permission metadata, coordinator cross-school project denial, and export audit access now align with the implemented role policy.

## Verification performed

- **Browser smoke check:** signed in as the seeded/demo Community Coordinator, the Dashboard, Community, Beneficiary, Monitoring, Projects, Progress Report, User Management, and Notifications pages loaded; no browser page errors were observed. This checked route rendering, not every create/edit/save workflow or every role.
- **Production build:** `npm run build` passed during this review.
- **Targeted tests:** 32 role authorization, coordinator user-management, Projects scope, report export-auditing, mother-monitoring, and child-monitoring tests passed for this update.
- **Full test command:** `npm test` passed with 190 tests and no failures after adding the role, export-audit, project-scope, and child-monitoring coverage, including Superadmin Projects denial.

## Overall conclusion

The system's modules have coherent purposes and the main role split is implemented with focused coverage for the reviewed findings. It is not yet accurate to conclude that every user can complete every task or that every end-to-end workflow is proven. Run the full suite and test representative workflows under each role before treating the release as fully verified.
