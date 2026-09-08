# Progress Report Architecture

This document describes the implemented Progress Report module. It is a code reference, not a future refactoring plan.

## Responsibilities

The module supports:

- Mother and child report views.
- School, group, batch, text, and structured search filters.
- Master List, Ranked by, and Graph View tabs.
- Configurable columns persisted per role and beneficiary type.
- Initial-BMI batch analysis for mothers.
- CSV and JSON export with a preview.

## Directory Map

```text
ProgressReport/
|-- ProgressReport.jsx                 Page controller and composition root
|-- ProgressReportTable.jsx            Table rendering
|-- progressReportUtils.js             Field library, normalization, sorting, helpers
|-- ARCHITECTURE.md                    This document
|-- REFACTORING_GUIDE.md               Maintenance and extension guide
|
|-- components/
|   |-- ProgressReportFilterBar.jsx    Context, search, quick filters, entity type
|   `-- ProgressReportToolbar.jsx      Tabs, ranking, and export actions
|
|-- hooks/
|   |-- useReportData.js                Fetching, normalization, ranking, graph data
|   |-- useProgressFilters.js           Filter state and derived filtered rows
|   |-- useColumnPreferences.js         Column state and localStorage persistence
|   `-- useReportExport.js              Export state, preview data, download orchestration
|
`-- utils/
    |-- apiUtils.js                     Requested API field construction
    |-- filterUtils.js                  Pure filter parsing and application
    |-- columnUtils.js                  Column persistence and visibility helpers
    `-- exportUtils.js                  CSV/JSON formatting and browser downloads
```

## Runtime Data Flow

```text
MothersContext / apiGetChildren()
                |
                v
        useReportData
                |
        normalizeMother/Child
                |
                v
             allRows
                |
        useProgressFilters
                |
          filteredRows
                |
       active tab selection
                |
                v
        ProgressReportTable
```

For mothers, `useReportData` calls `refreshMothers(selectedFields)`, which requests fresh records from `/api/mothers` and updates `MothersContext`. For children, it calls `apiGetChildren(selectedFields)`. Both paths expose `loadingData` so the page does not present the previous snapshot as a completed fetch. Requested fields come from `buildRequestFields`, based on visible columns, entity columns, and role defaults.

## Components

### `ProgressReport.jsx`

The page-level controller owns view state for the active tab, entity type, ranking, graph controls, and export preview. It composes the hooks and child components and selects `displayedRows`.

Important behavior:

- `Graph View` renders bar, line, or pie charts from `filteredRows`; the graph field comes from managed columns and can be grouped by progress range, community, group, or batch. The School selector filters the same community value used by the charts.

### `ProgressReportFilterBar.jsx`

Renders school, group, and batch selectors; free-text search; active filter chips; advanced quick filters; and the Mothers/Children switch. Quick filters append recognized query text such as `high risk`, `underweight`, and `progress 0-25%`.

### `ProgressReportToolbar.jsx`

Renders report tabs, ranking controls, and export actions.

### `ProgressReportTable.jsx`

Renders the active report rows with ranked columns, visible entity columns, progress bars, trend badges, and date formatting.

## Hooks

### `useReportData({ ... })`

Fetches the active entity data and creates report-ready rows.

- `selectedFields`: requested API fields from `buildRequestFields`.
- `allRows`: normalized and sorted mother or child rows.
- `rankedRows`: group and batch aggregates sorted by the selected managed numeric column.
- `graphRows`: counts and shares for four progress ranges.
- `loadingData`: loading state for the active mother or child database request.

Mother data comes from `MothersContext`; child data is fetched locally. The hook intentionally does not own mother loading state.

### `useProgressFilters({ ... })`

Owns `school`, `group`, `batch`, `search`, and `showAllFilters`. It derives parsed search filters, filtered rows, active filter count, and cascading selector options. It validates stale selector values and resets selector/search state when the entity type changes.

### `useColumnPreferences({ ... })`

Owns visible columns, field search, menu visibility, and expanded field groups. Preferences use the localStorage key `progress-report-columns-{roleName}-{beneficiaryType}`. `mergeColumnPreferences` keeps saved preferences compatible with the current field library.

### `useReportExport({ ... })`

Owns export preview state, format, filename, and selected columns. It calls `getExportData`, limits previews to 20 rows, and delegates browser downloads to `exportReport`.

## Utility Functions

### `progressReportUtils.js`

Defines maternal and child field libraries, `REPORT_TABS`, role defaults, and `SEARCH_FILTER_RULES`.

Key functions:

- `getDefaultVisibleColumns`, `getReportColumnsForEntity`, `getFieldGroups`, `getFieldById`: field metadata and role defaults.
- `getColumnValue`: display value lookup.
- `normalizeMother`, `normalizeChild`: convert API records to a common report row shape.
- `getInitialCheckup`: obtain the first recorded maternal checkup.
- `sortReportRows`: apply report ordering.
- `getBmiCategory`, `hasValue`: reusable value helpers.
- `formatDate`, `formatDelta`, `fullName`: display helpers.
- `getRowKey`: stable row identity for selection and rendering.

### `utils/filterUtils.js`

- `parseContext`: creates school/group/batch context and All-state flags.
- `parseQuery`: extracts recognized search rules and leaves free text.
- `filterRows`: applies text, context, and structured filters.
- `countActiveFilters`: counts visible filter state.
- `extractOptions`: creates cascading selector options.
- `validateAndNormalizeContext`: resets unavailable selector values.

### `utils/apiUtils.js`

Builds requested API fields and query parameters. `buildRequestFields` includes required report fields in addition to visible columns; `validateFieldAgainstSchema` checks field allowlists.

### `utils/columnUtils.js`

Loads, saves, merges, searches, groups, and toggles column preferences. The localStorage calls are isolated to `loadColumnPreferences` and `saveColumnPreferences`.

### `utils/exportUtils.js`

- `getRowValue`: maps report fields to export values.
- `generateCsvContent`: creates escaped CSV content.
- `generateJsonContent`: creates formatted JSON content.
- `getExportData`: selects rows and columns for Master, Summary, Graph, or Ranked views.
- `getExportPreviewRows`: returns the first N rows, normally 20.
- `exportReport`: adds a date suffix and downloads CSV or JSON through `downloadContent`.

## Extension Rules

1. Add new field metadata to the appropriate field library.
2. Add the field to the server/API allowlist if needed.
3. Update `normalizeMother` or `normalizeChild` when transformation is required.
4. Add structured search behavior to `SEARCH_FILTER_RULES` and `filterRows`.
5. Add export-specific handling to `getRowValue` only for non-direct values.
6. Keep JSX in components and calculations in hooks or pure utilities.

## Verification

From the repository root:

```text
npm run build
```

When changing data selection or filters, verify both entity types, all report tabs, column persistence, and CSV/JSON export.
