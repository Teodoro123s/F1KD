# Progress Report Module Guide

## 1. Purpose

The Progress Report module produces a filtered, configurable report for beneficiaries organized by school, group, and batch. It supports two report levels:

- **Child level**: one row per child.
- **Mother level**: one row per mother, aggregated across her children.

The active page is available at `/progress-report`.

The report is intended for operational review and CSV export. It combines hierarchy, identity, health/status, growth, and monitoring information into a selectable table.

## 2. User Flow

1. The user opens `/progress-report`.
2. The page loads report options from `/api/progress-report/options`.
3. The user selects a **School**. This is required before report generation.
4. The user may narrow the report to a **Group** and then a **Batch**.
5. The user selects the report level:
   - `Child level`
   - `Mother level`
6. The user selects the fields to show and export.
7. The user clicks **Generate Report**.
8. The page requests the report from `/api/progress-report`.
9. Results are sorted locally according to the selected sort key and displayed in the report table.
10. The user may move between result pages or export the active report as CSV.

The generated result is stored in a finalized snapshot. This keeps the displayed report tied to the filters, field selection, sort order, and page that produced it while the user continues interacting with the setup controls.

## 3. Frontend Structure

| File | Responsibility |
| --- | --- |
| [ProgressReport.jsx](../src/pages/ProgressReport/ProgressReport.jsx) | Active page controller, setup form, report generation, sorting, table, CSV export |
| [progressReport.js](../src/api/progressReport.js) | API wrappers for options and report requests |
| [ProgressReportTable.jsx](../src/pages/ProgressReport/ProgressReportTable.jsx) | Reusable table from the older report architecture |
| [progressReportUtils.js](../src/pages/ProgressReport/progressReportUtils.js) | Field libraries, legacy normalization, defaults, and utility functions |
| [filterUtils.js](../src/pages/ProgressReport/utils/filterUtils.js) | Legacy/reusable filtering and structured-search utilities |
| [apiUtils.js](../src/pages/ProgressReport/utils/apiUtils.js) | Legacy/reusable field request helpers |
| [exportUtils.js](../src/pages/ProgressReport/utils/exportUtils.js) | Legacy/reusable CSV/JSON export helpers |
| [useReportData.js](../src/pages/ProgressReport/hooks/useReportData.js) | Legacy/reusable fetch and normalization hook |
| [useProgressFilters.js](../src/pages/ProgressReport/hooks/useProgressFilters.js) | Legacy/reusable filter-state hook |

The current route uses the direct hierarchical implementation in `ProgressReport.jsx`. The hook-based files remain reusable module infrastructure and documentation references, but their behavior should not be assumed to be active unless a caller composes them.

## 4. API Endpoints

The server mounts the router at `/api/progress-report` in [server/index.js](../server/index.js). Both endpoints require authentication and operational authorization.

### 4.1 Options

```http
GET /api/progress-report/options
```

Returns:

```json
{
  "schools": [],
  "groups": [],
  "batches": [],
  "mothers": []
}
```

The active frontend uses `schools`, `groups`, and `batches` to populate cascading selectors. The `mothers` list is returned by the API but is not used by the active setup flow.

### 4.2 Report

```http
GET /api/progress-report
```

Supported query parameters:

| Parameter | Required | Meaning |
| --- | --- | --- |
| `schoolId` | Yes in the active UI | Community/school database ID |
| `groupId` | No | Group database ID |
| `batchId` | No | Batch database ID |
| `motherId` | No | Mother database ID; supported by the server parser but not exposed by the active setup UI |
| `granularity` | No | `child` by default; `mother` selects mother aggregation |
| `page` | No | 1-based page number; defaults to `1` |
| `perPage` | No | Clamped between `1` and `100`; active UI requests `50` |
| `export=1` | No | Returns all rows in one response for export-style requests |
| `search` | No | Parsed by the server but not sent by the active page implementation |

Example:

```text
/api/progress-report?schoolId=1&groupId=4&batchId=7&granularity=child&page=1&perPage=50
```

The response contains:

```json
{
  "rows": [],
  "pagination": {
    "page": 1,
    "perPage": 50,
    "total": 0,
    "totalPages": 1
  },
  "summary": {
    "total": 0,
    "averageProgress": 0,
    "groupCount": 0,
    "batchCount": 0
  },
  "breadcrumb": []
}
```

## 5. Hierarchy Parameters and Cascading Behavior

The hierarchy is:

```text
School
  └── Group
        └── Batch
              └── Beneficiary
```

The active UI enforces this order:

- Group is disabled until a school is selected.
- Batch is disabled until a group is selected.
- Changing school clears group and batch.
- Changing group clears batch.
- A school is mandatory for report generation.
- Group and batch are optional, so a school-wide report is valid.

The server applies filters to the child owner row:

- `schoolId` filters `c.community_id`.
- `groupId` filters `c.group_id`.
- `batchId` filters `c.batch_id`.
- `motherId`, when supplied, filters `m.id`.

This means a child-level report includes children whose own hierarchy assignment matches the selected IDs. A mother-level report is built from the same child/mother join and therefore represents mothers connected to matching child records.

## 6. Report Levels

### 6.1 Child Level

Child level is the default. The query returns one grouped row per child and includes:

- School
- Group
- Batch
- Mother name
- Child name
- Age
- Sex
- Date of birth
- Contact number
- Status
- Risk level
- Program
- Delivery type
- Growth metrics
- Activity counts
- Progress percentage
- Last activity date
- Next check-up date

Child progress is calculated as:

```text
completed child check-ups / 48 * 100
```

The result is rounded to a whole percentage.

### 6.2 Mother Level

Mother level returns one row per mother. Child check-ups are aggregated across the mother’s children.

Mother progress is calculated as:

```text
completed child check-ups / (number of children * 48) * 100
```

Mother-level fields that are child-specific, such as sex and delivery type, are returned as empty or null values.

## 7. Primary Child Growth Report

The primary child report metrics are:

1. **Weight-for-Age**
2. **Height-for-Age**
3. **BMI-for-Age**

The active UI includes these fields in `DEFAULT_VISIBLE_FIELDS`, so they are selected after a fresh page load or when the user clicks **Reset columns**.

### 7.1 Data Source

The server selects the most recent `child_checkups` record for each child, ordered by:

1. `visit_date DESC`
2. `id DESC` as a tie-breaker

The values are:

- `weightForAge`: latest recorded weight
- `heightForAge`: latest recorded height
- `bmiForAge`: calculated from latest weight and height

BMI is calculated as:

$$
BMI = \frac{weight\ in\ kg}{(height\ in\ meters)^2}
$$

The value is rounded to one decimal place.

### 7.2 Important Interpretation Limit

Despite the report labels, the current implementation does **not** calculate clinical age-standardized growth indicators or WHO z-scores. It reports the latest measured weight, height, and calculated BMI for a child whose age is also displayed.

Therefore:

- `Weight-for-Age` currently means latest weight associated with the child’s current age.
- `Height-for-Age` currently means latest height associated with the child’s current age.
- `BMI-for-Age` currently means latest BMI associated with the child’s current age.
- No sex-specific reference population is applied.
- No LMS/WHO standard deviation score is calculated.
- No underweight, stunting, wasting, or obesity classification is derived by age.

A future clinical implementation should add reference tables and calculate age-, sex-, and measurement-date-specific z-scores before treating these as formal anthropometric indicators.

## 8. Field Selection

The active report fields are grouped as follows.

### Hierarchy

- School
- Group
- Batch

### Identity

- Mother Name
- Child Name
- Age
- Sex
- Date of Birth
- Contact Number

### Health & Status

- Status
- Risk Level
- Program
- Delivery Type

### Growth & Monitoring

- Weight-for-Age
- Height-for-Age
- BMI-for-Age
- Activities Completed
- Total Activities
- Progress %
- Last Activity
- Next Check-up

The visible field list controls both:

- Columns rendered in the result table.
- Columns included in the active CSV export.

The current default selection is:

```text
School, Group, Batch, Mother Name, Child Name,
Weight-for-Age, Height-for-Age, BMI-for-Age,
Activities Completed, Total Activities, Progress %
```

A field may be selected even when the current report level has no meaningful value for it. For example, child-only fields can be empty in mother-level reports.

## 9. Sorting and Pagination

### Sorting

After the server responds, the active frontend sorts the returned page locally. Clicking a table header toggles ascending and descending order for that field.

Important consequence: sorting is applied only to the rows already returned for the current server page. It is not a server-side sort across the complete result set.

### Pagination

- The server paginates the report.
- The active UI requests 50 rows per page.
- Previous and Next request another server page.
- The page number input allows direct navigation within `totalPages`.
- Export requests may use `export=1` to receive all rows.

## 10. Export

The active page exports CSV directly in the browser.

The export includes:

- A breadcrumb comment line.
- A generated timestamp comment line.
- The currently selected field labels.
- Values from the active report rows.

CSV values are quoted and embedded quotes are doubled.

The filename is:

```text
progress-report-child.csv
progress-report-mother.csv
```

The older reusable export utility also supports CSV and JSON, but the active hierarchical page currently uses its local CSV export function rather than the hook-based export flow.

## 11. Authentication, Authorization, and Scope

The server route is mounted as:

```javascript
app.use('/api/progress-report', verifyToken, authorizeOperational, progressReportRouter);
```

### Authentication

`verifyToken` must attach a valid authenticated user. Missing or invalid authentication returns `401`.

### Operational Authorization

`authorizeOperational` applies these role rules:

| Normalized role | Requirement | Server scope assignment |
| --- | --- | --- |
| `super_admin` | Authenticated | No school or group restriction is assigned |
| `partner` | Authenticated and assigned to a school | `req.schoolId` is set to the assigned school; `req.groupId` may be set to the assigned group |
| `admin` | Authenticated | No school or group restriction is assigned by this middleware |

The role aliases include community organizer, health worker, partner, admin, administrator, super admin, and superadmin variants.

### Scope Exemption / Current Limitation

The authorization middleware calculates `req.schoolId` and `req.groupId`, but the current `progressReport.js` query does not add those request-scope values to `hierarchyWhere`. It filters only from the client-supplied `schoolId`, `groupId`, and `batchId`.

That means the UI is school-oriented for partner users, but the report route currently does not independently enforce the assigned school/group in the SQL query. This is an important security and data-isolation limitation. A production-hardening change should intersect client filters with `req.schoolId` and `req.groupId` or reject out-of-scope IDs on the server.

## 12. Empty, Missing, and Exempt Values

The report intentionally converts missing values to safe display defaults:

- Missing school: `Unassigned school`
- Missing group: `Unassigned group`
- Missing batch: `Unassigned batch`
- Missing mother: `Unnamed mother`
- Missing child: `Unnamed child`
- Missing numeric/date/text values: empty API value, displayed as `—` in the active table
- Missing progress: `0`
- Missing activity count: `0`

Mother-level exemptions:

- Sex is not applicable and is returned empty.
- Delivery type is not applicable and is returned empty.
- Child growth metrics are not clinically meaningful at mother level and are returned null/empty.

Child-level exemptions:

- Mother-only fields are not exposed by the active field list.
- Growth metrics are empty when the child has no check-up with a recorded measurement.
- BMI is empty when height is zero, missing, or invalid.

## 13. Database Flow

The report reads from:

- `children`
- `mothers`
- `communities`
- `groups`
- `batches`
- `child_checkups`

The main query joins child records to their mothers and hierarchy records, then left-joins check-ups for activity counts and dates.

The query uses:

- `COUNT(DISTINCT cc.id)` for completed activities.
- `MAX(cc.visit_date)` for the last activity.
- `MIN(cc.next_checkup_date)` for the next scheduled check-up.
- A 48-check-up total for child monitoring.
- Latest-check-up subqueries for weight, height, and BMI.

The route returns normalized camelCase properties so the frontend does not need to know database column names.

## 14. Error and Loading Behavior

Frontend errors are placed in the report setup area with `role="alert"`.

The page prevents report generation when no school is selected. API errors are converted to user-facing messages such as:

- `Unable to load report options.`
- `Unable to generate report.`
- `Please select at least a School to view the report.`

The server logs detailed errors and returns `db error` for unexpected database failures.

## 15. Known Gaps and Recommended Follow-up

1. **Enforce operational scope in SQL.** Partner users should not be able to request a different school by changing query parameters.
2. **Implement true anthropometric standards.** Replace latest measurements with age- and sex-standardized WHO z-scores where clinical reporting is required.
3. **Move sorting server-side.** Current sorting only reorders the current page.
4. **Align active and legacy report implementations.** The repository contains a newer direct hierarchical report and older hook-based report infrastructure with different field libraries and export behavior.
5. **Add automated route tests.** Cover school, group, batch, mother, child, pagination, missing measurements, and unauthorized scope requests.
6. **Add explicit report-level validation.** Child growth fields should be visibly marked as not applicable or omitted when the user selects mother level.
7. **Validate export completeness.** Confirm that large reports use `export=1` and are not silently limited to the currently visible page.

## 16. Verification Checklist

When changing this module, verify:

- `/progress-report` loads options.
- School selection enables group selection.
- Group selection enables batch selection.
- Report generation is blocked without a school.
- Child and mother report levels return the expected row shape.
- Weight-for-Age, Height-for-Age, and BMI-for-Age appear for children.
- Missing measurements render as empty/`—` rather than breaking the report.
- Pagination requests the correct server page.
- Sort toggles work for numeric and text fields.
- CSV headers match the selected fields.
- Partner users cannot access data outside their assigned school/group.
- Server-side route syntax and the frontend build pass.

Recommended validation command:

```text
npm run build
```
