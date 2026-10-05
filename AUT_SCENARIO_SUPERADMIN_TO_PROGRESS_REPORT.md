# AUT Scenario: Super Admin to Progress Report Download

## Scenario Details

| Field | Value |
|---|---|
| Scenario ID | AUT-E2E-001 |
| Title | Provision a school, register operational users, create and monitor beneficiaries, attach a program, and download a progress report |
| Type | Manual end-to-end acceptance test |
| Priority | High |
| Roles exercised | Super Admin, Community Organizer, Health Worker, Admin, Partner |
| Result | Pass when each role meets its access scope and report-enabled roles generate and download correctly scoped CSV reports |

## Role Permission Matrix Under Test

| Capability | Super Admin | Community Organizer | Health Worker | Admin | Partner |
|---|---|---|---|---|---|
| Community view | Global | Assigned school | Assigned school/group | All schools | All schools |
| User Management | Full access | Redirect/denied | Redirect/denied | Redirect/denied | Redirect/denied |
| Beneficiary view | No access | Assigned school | Assigned group | All schools | All schools |
| Beneficiary writes | No access | Create/edit/delete | Edit profile only | None | None |
| Monitor checkups | No access | Record | Record | View only | View only |
| Program view | No access | Assigned school | Assigned school/group | All schools | All schools |
| Program create/edit/scope | No access | Allowed | Denied | Denied | Denied |
| Program monitored/received | No access | Mark | Mark | View only | View only |
| Progress Report and CSV | No access | Assigned school | Assigned school/group | All schools | All schools |
| Scope/ownership | Global administration | School-scoped | School and group-scoped | Global read-only; owns no school | Global read-only; owns no school |

## Page and Route Specification

| AUT area | Page / route | Roles and page specification |
|---|---|---|
| Sign-in | `/login` | All test roles authenticate here. Verify successful login and correct role-specific navigation. |
| Community and school setup | `/community`, `/community/school/:schoolId` | Super Admin creates the school. Community Organizer maintains its group/batch hierarchy. Health Worker, Admin, and Partner use the page as read-only viewers within their specified scope. |
| User registration | `/user-management`, `/user-management/school/:schoolId` | Super Admin only. Create Community Organizer, Health Worker, Admin, and Partner test accounts; record one-time credentials and assignments required by the role. Other roles must be redirected/denied. |
| Beneficiary list and creation | `/beneficiary`, `/beneficiary/create/mother`, `/beneficiary/create/child` | Community Organizer creates the mother and child. Health Worker, Admin, and Partner cannot create records. Super Admin has no Beneficiary page access. |
| Beneficiary profiles | `/beneficiary/mother/:id/profile`, `/beneficiary/child/:childId/profile` | Community Organizer manages assigned-school records. Health Worker can edit assigned-group mother/child profiles but cannot create/delete or change assignments. Admin and Partner view globally without profile mutations. |
| Monitoring | `/monitoring`, `/beneficiary/mother/:id/monitoring` | Community Organizer and Health Worker can record checkups in their allowed scope. Admin and Partner can view all schools but cannot save checkups. Super Admin has no Monitor page access. |
| Program list and detail | `/program`, `/program/:programId`, `/program/:programId/school/:schoolId`, `/program/:programId/group/:groupId`, `/program/:programId/batch/:batchId` | Community Organizer creates programs, attaches school/group/batch scope, and marks beneficiaries monitored/received. Health Worker views assigned-school/group programs and can mark monitored/received. Admin and Partner view all schools read-only and cannot change program or monitoring data. |
| Progress Report | `/progress-report` | Community Organizer generates school-scoped reports; Health Worker generates reports scoped to assigned school/group; Admin and Partner generate global reports. All report-enabled roles can export CSV. Super Admin has no page access. |
| Notifications | `/notifications` | Health Worker verifies beneficiary update notifications in the Beneficiaries category. Community Organizer verifies notifications for the assigned school. Admin and Partner can view notifications available to their global read-only accounts. |

For every direct route in this table, verify both the visible navigation and the route guard. Hidden buttons alone do not count as authorization; unsupported writes must also be rejected by the API.

## Preconditions

- Run against a disposable test environment with the API, frontend, and database available.
- Have an active Super Admin account and a way to access the one-time credentials shown after user creation.
- Use only synthetic data. Do not use real beneficiary or user data.
- Have at least one test school coordinator available to assign during school creation, or create the school without one and assign the new Community Organizer afterward if the form permits it.
- Include synthetic Beneficiaries notifications with no individual recipient restriction from at least two schools for the Admin/Partner notifications checks.
- Use a unique suffix for this execution, such as `AUT-20261001-01`, to avoid colliding with existing records.

## Test Data

| Record | Example value |
|---|---|
| Run suffix | `AUT-20261001-01` |
| School | `AUT School AUT-20261001-01` |
| Group | `AUT Group AUT-20261001-01` |
| Comparison group | `AUT Comparison Group AUT-20261001-01` |
| Batch | `AUT Batch AUT-20261001-01` |
| Community Organizer | `AUT Coordinator` with a unique test email |
| Health Worker | `AUT Health Worker` with a unique test email |
| Mother | `AUT Mother` with valid synthetic contact, date of birth, and required form fields |
| Comparison mother | `AUT Comparison Mother` assigned to the comparison group |
| Child | `AUT Child` with a valid birth date and required form fields |
| Program | `AUT Nutrition Program AUT-20261001-01` |
| Provider | `AUT Test Provider` |

## Test Steps

### A. Create the school and operational users

1. Open the app and sign in as an active Super Admin.
   - **Expected:** Login succeeds and the Community module is available. User Management is available; operational Beneficiary, Monitor, Program, and Progress Report pages are not part of the Super Admin route allowlist.

2. Open **Community** and choose the action to create a school.
   - Enter the unique school name.
   - Select a Community Coordinator if an appropriate test coordinator already exists; otherwise leave it unassigned if allowed.
   - Submit the form.
   - **Expected:** The new school appears once in the school list and can be opened.

3. Open **User Management** and add a user with the **Community Organizer** role.
   - Enter valid synthetic name, contact, email, date of birth, and active status.
   - Assign the new school.
   - Submit and record the one-time credentials shown by the app.
   - **Expected:** The user is created, appears in the user list for the school, and the one-time credentials are displayed.

4. Sign out as Super Admin and sign in using the new Community Organizer credentials.
   - **Expected:** Login succeeds and the Community view is scoped to the assigned school.

5. In Community, create the test group and comparison group, then create a batch under each group.
    - **Expected:** Both groups and batches appear in the test school hierarchy.

6. Sign out, sign back in as Super Admin, and add a user with the **Health worker** role.
   - Assign the test school and test group; use valid synthetic user fields and active status.
   - Record the one-time credentials.
   - **Expected:** The Health Worker account is created with both assignments. The form requires a school and group for this role.

### B. Create beneficiaries

7. Sign out as Super Admin and sign in as the Community Organizer.
   - **Expected:** The assigned school is still the active operational scope.

8. Open **Beneficiary** and create the test mother and comparison mother.
    - Complete all required fields with valid synthetic values. Assign the test mother to the test group/batch and the comparison mother to the comparison group/batch.
    - Save both records.
    - **Expected:** Both mothers appear under their respective groups in the test school.

9. Open the mother and create the test child.
   - Complete required child fields using synthetic values and save.
   - **Expected:** The child is created and appears under the correct mother and school/group/batch.

### C. Update beneficiary profiles and record monitoring

10. Sign out as Community Organizer and sign in as the Health Worker.
    - **Expected:** Beneficiary data is limited to the assigned school and group; the Health Worker does not see create or delete controls.

11. Open the test mother profile, change a permitted profile field, and save. Repeat for the test child profile.
    - Do not attempt to change school, group, batch, or mother assignment as the Health Worker.
    - **Expected:** Both profile updates save. Assignment fields remain unchanged, and no create/delete capability is granted.

12. Open **Notifications** and select **Beneficiaries**.
    - **Expected:** The Health Worker sees the mother and child update notifications for their own edits.

13a. As the Health Worker, open **Monitor** and record a valid checkup for the test mother and child. Save each entry.
    - **Expected:** Both checkups persist for the assigned group and the records show the latest monitoring values/status. Any validation errors are shown against the corresponding fields.

13b. Sign out as Health Worker and sign in as the Community Organizer. Record a separate valid checkup slot for the same test mother and child.
    - **Expected:** Community Organizer checkups also save and persist for the assigned school.
    - Open `/notifications`, select **Beneficiaries**, and verify the test-school notifications generated by the Health Worker profile edits in step 11 are visible to the Community Organizer.

### D. Attach and monitor the program

14. Continue signed in as the Community Organizer.

15. Open **Program** and create the test program.
    - Use the test program name and provider, select a valid program type, and choose **Mother** as the beneficiary type so both test mothers are reportable.
    - Save as an active program.
    - **Expected:** The program appears in the active program list.

16. Open the program's beneficiary-scope/cluster action and attach the entire test school using **School** scope, not only the test group or batch.
    - **Expected:** The selected school and its two groups are covered by the program, with both test mothers included in the beneficiary target/count.

17. As the Community Organizer, open the test program and mark the test beneficiary as monitored/received for the current date; confirm the action if prompted.
    - Mark both the test mother and comparison mother as monitored/received.
    - **Expected:** The Community Organizer can mark both beneficiaries monitored/received, and the state persists after refreshing or reopening the program.

18. Sign out as Community Organizer and sign in as the Health Worker. Reopen the program and try to mark the comparison mother, who belongs to a different group.
    - **Expected:** The comparison mother is not available to the Health Worker, or a direct API attempt is rejected with HTTP 403. Then mark the test mother monitored/received for the current date.
    - **Expected:** The Health Worker can mark the test mother within the assigned school/group but cannot mark beneficiaries in another group or edit the program definition/scope.

### E. Generate and download the report

19. Sign out as Health Worker and sign in as the Community Organizer.

20. Open **Progress Report**.
    - In Community Selection, select the test school and leave Group and Batch unfiltered for the school-wide comparison report.
    - Choose **Next: Report Focus**.
    - **Expected:** The school selector identifies the test school; Group and Batch can be cleared/remain at **All groups** and **All batches**, with no stale selection carried from a previous report. Report scope is the whole assigned school.

21. Select **Program Report**, choose **Mother**, select the test program, and choose **Overall** benefit period.
    - Choose **Next: Growth Metrics**.
    - **Expected:** The report accepts the selected program and beneficiary type.

22. Leave the default program metrics selected, then choose **Next: Results** to generate the report.
    - **Expected:** Results load without an error and include the test beneficiary/program data for the selected scope. The program monitoring value reflects the record saved in step 17.

23. Choose **Export CSV**.
    - **Expected:** A CSV file downloads with a name similar to `progress-report-mother.csv`. It opens as valid CSV, includes a header row, and contains the eligible mothers from both groups in the test school, with no records outside that school. Record its data-row count, excluding the header, for comparison with step 25.

24. Sign out as Community Organizer and sign in as the Health Worker. Open **Progress Report**.
    - **Expected:** The Health Worker can access report generation; school and group are fixed to the account assignments.

25. Generate the same Program Report for the Health Worker's assigned group and export CSV.
    - **Expected:** The report and CSV download succeed and contain only eligible records from the assigned school/group. Compare its data-row count (excluding the header) with the Community Organizer's school-wide CSV from step 23. Because the test school has a second group with an eligible beneficiary, the Health Worker's CSV must contain fewer rows. No other school's or group's records are present.

## Postconditions and Cleanup

- Record the downloaded CSV filename and the final pass/fail result; do not attach real personal data to test evidence.
- In a disposable test environment, remove the test users, school hierarchy, beneficiaries, and program through supported application controls if available. Do not perform cleanup against production data.
- Sign out of the final test account.

## Acceptance Criteria

- The Super Admin can create the school and provision the operational accounts.
- The Community Organizer can create the group, batch, mother, child, program, and program scope within the assigned school.
- The Community Organizer can record mother/child checkups and mark program beneficiaries monitored/received.
- The Health Worker can edit mother and child profiles, record checkups, and mark program beneficiaries monitored/received only within the assigned group.
- The Health Worker can generate Progress Reports and export CSV only for the assigned school/group.
- Beneficiary profile update notifications are visible to the editing Health Worker and the active Community Organizer assigned to the same school.
- The Community Organizer can generate a Program Report for the selected school and download a valid CSV containing the test data without out-of-scope records.
- Super Admin cannot access Progress Report; Admin and Partner can generate global reports and export CSV without changing records.

## Additional Role Scenarios

Use the school, group, batch, beneficiaries, and active program created in AUT-E2E-001. Run these scenarios in the same disposable test environment. Create each account as Super Admin and record its one-time credentials. User Management must remain unavailable to both roles.

### AUT-E2E-002: Admin global read-only and reporting access

**Precondition:** An active Admin test account exists. Use a disposable database containing synthetic records at more than one school so global visibility and report scope can be verified.

1. Sign in as Super Admin, open **User Management**, and create an active user with the **Admin** role and unique test credentials.
    - **Expected:** The account is created and one-time credentials are shown. No school ownership or assignment is required.

2. Sign out and sign in as the Admin.
    - **Expected:** Login succeeds. Community, Beneficiary, Monitor, Program, and Progress Report are available. User Management is unavailable.

3. Open Community, Beneficiary, Monitor, and Program and inspect records from the AUT school and at least one other test school.
    - **Expected:** The Admin can view data across all schools. No school is owned by or assigned to the Admin.

4. In Community, Beneficiary, Monitor, and Program, verify create, edit, and delete controls are hidden or disabled. In a resettable disposable database, use valid tokens, payloads, and sacrificial AUT records to probe these endpoints; every write must return HTTP 403 and leave records unchanged:

    The request paths below match the routers mounted by the API. Use valid request bodies and existing sacrificial records so a validation error or 404 cannot be mistaken for an authorization pass.

    | Operation | Request | Expected |
    |---|---|---|
    | Create mother | `POST /api/mothers` | 403 |
    | Create child | `POST /api/children` | 403 |
    | Update mother | `PUT /api/mothers/:id` | 403 |
    | Delete mother | `DELETE /api/mothers/:id` | 403 |
    | Mother checkup | `POST /api/mothers/:id/checkups` | 403 |
    | Mother document upload | `POST /api/mothers/:id/documents` | 403 |
    | Update child | `PUT /api/children/:id` | 403 |
    | Delete child | `DELETE /api/children/:id` | 403 |
    | Child checkup | `POST /api/children/:id/checkups` | 403 |
    | Program monitoring | `PATCH /api/programs/:id/monitoring` | 403 |

    These probes may mutate data under the current implementation, so run only against disposable/resettable test records.
    After probing, re-seed or restore the disposable database before running E2E-003 so both runs start from the same state.

5. Open **Progress Report**, select data spanning all test schools, generate a report, and choose **Export CSV**.
    - Select **All Schools** if available, choose a beneficiary type, and generate/export the report. The CSV data-row count must exactly equal the known number of report-eligible mothers or children in the disposable test dataset across all schools, with no missing or extra rows. Generating/exporting reports does not alter application records.
    - **Current UI note:** If there is no **All Schools** option, record a global-report-filter failure. Per-school CSV exports can be used to diagnose the issue, but do not count as passing the single global report requirement.

6. Open `/notifications`, select **Beneficiaries**, and verify the synthetic unrestricted notifications from at least two schools are visible without edit controls.
    - **Expected:** The Admin can view notifications across all schools without modifying them.

7. Open **User Management** directly by URL and request `GET /api/users` with the Admin token.
    - **Expected:** The UI route redirects away and the API returns HTTP 403; Admin cannot list or manage user accounts.

**Pass criteria:** Admin has global read-only access to operational modules, can generate and download cross-school reports, and cannot create/edit/delete operational records or access User Management through either UI or API.

### AUT-E2E-003: Partner global read-only and reporting access

**Role note:** Partner does not own a school and has the same permissions as Admin: read-only access across all schools, with Progress Report generation/export allowed. Do not assign a school to the Partner as an ownership relationship.

**Implementation status:** The previous discrepancy notes are obsolete. Focused authorization and notification tests now cover Admin/Partner global scope, read-only operational access, notification scope, and progress-report authorization. This manual scenario still verifies the authenticated UI, cross-school report contents, and CSV output against seeded data; passing unit tests alone does not count as a complete AUT pass.

1. Sign in as Super Admin and create an active user with the **Partner** role and unique test credentials. Do not designate any school as owned by or assigned to the Partner.
    - **Expected:** The account is active and has the same effective access policy as Admin without a school ownership/assignment requirement.

2. Sign out and sign in as the Partner.
    - **Expected:** Login succeeds. Community, Beneficiary, Monitor, Program, and Progress Report are available. User Management is unavailable.

3. Open Community, Beneficiary, Monitor, and Program and inspect records from the AUT school and at least one other test school. Compare visible records with the Admin account.
    - **Expected:** The Partner sees the same records across all schools as Admin. No school is owned by or assigned to the Partner.

4. In Community, Beneficiary, Monitor, and Program, verify create, edit, and delete controls are hidden or disabled. Repeat every API probe in AUT-E2E-002 step 4 with the Partner token and valid test payloads/records.
    - Keep the Partner unassigned during these checks. Global access must work without a school assignment, and write probes must return HTTP 403 without mutating records.
    - **Expected:** Every write returns HTTP 403 and leaves records unchanged. Program monitoring controls match the Admin account and cannot change monitoring data.
    - After the write probes, re-seed or restore the disposable database before running the report and notification checks.

5. Open **Progress Report**, select data spanning all test schools, generate a report, and choose **Export CSV**.
    - **Expected:** Report generation and CSV download succeed. The CSV data-row count equals the known number of report-eligible mothers or children across all schools in the disposable test dataset, with no missing or extra rows. Generating/exporting reports does not alter application records.

6. Open `/notifications`, select **Beneficiaries**, and verify the synthetic unrestricted notifications from at least two schools are visible without edit controls.
    - **Expected:** The Partner can view notifications across all schools without modifying them.

7. Open **User Management** directly by URL and request `GET /api/users` with the Partner token.
    - **Expected:** The UI route redirects away and the API returns HTTP 403; Partner cannot list or manage user accounts.

**Pass criteria:** Partner and Admin have identical global read-only access across all schools, except report generation/export is permitted for both. Neither role owns a school, manages users, or mutates operational records. Any access-scope, write-permission, Program monitoring, or report-access difference is logged as a role-parity defect.
