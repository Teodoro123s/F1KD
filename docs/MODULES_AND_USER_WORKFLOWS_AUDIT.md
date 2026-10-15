# F1KD Modules and User Workflows Audit

**Reviewed:** 2026-10-16

## Summary

The main workflows generally match their intended users: coordinators manage school operations, health workers perform assigned-group beneficiary and monitoring tasks, and administrators have read-oriented operational oversight. The interface and route structure load for the signed-in Community Coordinator used for the browser smoke check.

This is not evidence that every role can complete every workflow end to end. The most important outstanding concerns are program-level authorization consistency and limited API integration coverage for saved beneficiary monitoring records. See [Open findings](#open-findings).

## Roles and module access

Access below reflects the current route and API design. Record-level restrictions still apply within a module.

| Role | Intended module access and responsibilities |
|---|---|
| **Superadmin** | Global dashboard, community oversight, user administration, system activity reports, and notifications. Operational beneficiary/program workflows and Progress Report are not exposed through the main operational routes. |
| **Admin** | Operational dashboard and read-oriented access to community, beneficiaries, monitoring, programs, Progress Report, and notifications. |
| **Community Coordinator** | School-level operations: community structures, beneficiary records, monitoring, programs and recipient scopes, Progress Reports, and limited health-worker account management. |
| **Partner** | Operational dashboard and read-oriented access to community, beneficiaries, monitoring, programs, Progress Report, and notifications. |
| **Health Worker** | Assigned-school/group beneficiary and monitoring work, program receipt history/check-ins, Progress Reports, and scoped notifications. Does not manage community structures, programs, or user accounts. |

Authenticated users can also access their profile and settings routes. See [App.jsx](../src/App.jsx), [permissions.js](../src/utils/permissions.js), and [authorize.js](../server/middleware/authorize.js).

## Module purpose and current assessment

| Module | Purpose and role fit | Assessment |
|---|---|---|
| **Sign-in and account recovery** | Authenticate users and provide account/password recovery. Role identity is normalized before authorization. | Core authentication and recovery paths have targeted tests; not exercised for every role in this review. |
| **Dashboard** | Give users a role-appropriate operational overview and shortcuts to their work. Superadmin gets broader oversight. | Dashboard supports different role contexts and loads independent data sections resiliently. The signed-in coordinator dashboard rendered in the smoke check. No dedicated dashboard workflow tests were found in the reviewed set. |
| **Community** | Organize schools, groups, and batches. Coordinators maintain school structures; health workers are read-only. | Create-menu and school/group scope behavior have documented and automated coverage. Coordinators cannot create or delete schools. |
| **Beneficiary** | Register and maintain mother and child records, then view their profiles and linked information. | Coordinator intake and health-worker limited updates fit the role split; Admin and Partner are read-only. The main missing confidence is API-level testing of successful record persistence and monitoring side effects. |
| **Monitoring** | Record and review beneficiary checkups and child measurements for follow-up. | Coordinator and health-worker write paths are scoped; Admin and Partner are read-only. Health-worker views are group-scoped. Core authorization is tested, but successful database persistence/progress recalculation lacks direct route integration tests. |
| **Program** | Define programs, assign school/group/batch coverage, automatically include eligible recipients, and record dated receipt check-ins. | Coordinator management and health-worker receipt tasks fit the intended workflow. Program recipient-scope helper behavior is tested. Program mutation authorization has unresolved object-level and role-policy mismatches; see findings below. |
| **Progress Report** | Filter by school/group/batch, review progress and growth measures, and export results. | Operational roles can use the report flow, with assigned-school/group filters and server-derived scope. Export event logging is narrower than the export UI permissions. |
| **User Management** | Let Superadmins administer accounts and coordinators manage health workers assigned to their school. | Coordinator health-worker lifecycle management and school containment have targeted route tests. The static permission map does not fully represent the coordinator-specific workflow. |
| **Reports** | Let Superadmins review operational sign-in activity across users and schools. | Superadmin-only route; report excludes Superadmin activity from ordinary operational login totals. |
| **Notifications** | Give users role- and assignment-scoped operational updates. | Server filters by role, school/group, and recipient; read state is per-user and visibility is checked before marking read. The UI does not currently navigate to the related record using the returned `linkTo`. |
| **Profile and Settings** | Show account and assignment details, allow password change, and store an appearance preference. | Available to authenticated users; profile fields are read-only, and dark mode is stored locally. These routes received code inspection but not a full save/password-change browser test. |

## Open findings

### High priority: program mutations need record-level scope checks

Program listing and scope assignment apply school/group rules, but update, end, restore, and delete handlers operate by program ID without consistently verifying that a Community Coordinator owns that program's school scope. A coordinator may be able to target a different school's program through a direct API request.

There is also a frontend/backend policy mismatch: the application routes do not expose Program to Superadmin, while shared API authorization permits Superadmin writes. Decide the intended policy and enforce the same rule in the API, UI, and tests.

**Recommended:** centralize a program-scope authorization check and apply it to every program mutation; add tests for same-school success, cross-school denial, and Superadmin behavior.

### Medium priority: permission metadata and effective user-management access differ

The `PERMISSIONS['user-management']` map lists Superadmin only, but the application intentionally grants Community Coordinators a limited health-worker management workflow. This is not itself an API bypass, but any component relying on `can()` may incorrectly hide or deny coordinator actions.

**Recommended:** represent coordinator-limited access explicitly or document and stop using the map as an authoritative check for this resource.

### Medium priority: beneficiary monitoring save paths need API integration tests

Authorization tests cover who may write, but the reviewed suite does not directly verify that a successful mother/child checkup persists its log, updates derived progress, and emits the expected notification.

**Recommended:** add route-level tests with a test database or injected repository for successful saves, validation failures, school/group denial, progress recalculation, and notification side effects.

### Medium priority: export controls and export audit do not cover the same roles

Progress Report offers export to operational users, while the download/audit endpoint is authorized only for Admin and Partner. Coordinator and Health Worker exports may therefore not be recorded.

**Recommended:** either record downloads for every role allowed to export or narrow the UI permission and explain the restriction.

### Lower priority: notification destinations and access-denial feedback

- Notifications include a related-record link from the API, but opening an item currently marks it read and shows details without navigating to that record.
- Disallowed frontend routes redirect to Community without explaining that access was denied.

**Recommended:** make available notification destinations actionable and provide a clear, role-appropriate access-denied message.

## Verification performed

- **Browser smoke check:** signed in as the seeded/demo Community Coordinator, the Dashboard, Community, Beneficiary, Monitoring, Program, Progress Report, User Management, and Notifications pages loaded; no browser page errors were observed. This checked route rendering, not every create/edit/save workflow or every role.
- **Production build:** `npm run build` passed during this review.
- **Targeted tests:** 29 role-authorization, Program scope-helper, and child-age tests passed. The legacy JavaScript age-test file referenced a nonexistent `childAge.js` and an obsolete half-month helper; it was aligned with the current `childAge.mjs` API.
- **Full test command:** `npm test` did not complete within approximately six minutes and was stopped after its first 21 subtests. Do not treat the full suite as passing until the cause of the stall is identified and the suite completes.

## Overall conclusion

The system's modules have coherent purposes and the main role split is mostly implemented. It is not yet accurate to conclude that every user has completed every task or that every end-to-end workflow is proven. Close the Program authorization findings and add persistence-level coverage for monitoring, then run the full suite and test representative workflows under each of the five roles before treating the release as fully verified.
