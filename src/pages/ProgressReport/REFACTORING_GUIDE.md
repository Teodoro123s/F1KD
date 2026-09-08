# Progress Report Maintenance Guide

The Progress Report module is already split into a page controller, reusable components, custom hooks, and utilities. Use this guide when changing the implementation.

## Change Routing

Use the smallest owning module:

| Change | File |
| --- | --- |
| Add or rename a report field | `progressReportUtils.js` |
| Change API field selection | `utils/apiUtils.js` and `hooks/useReportData.js` |
| Change normalization or progress values | `progressReportUtils.js` |
| Add a search token or filter rule | `progressReportUtils.js` and `utils/filterUtils.js` |
| Change selector or search state | `hooks/useProgressFilters.js` |
| Change column persistence or field-menu behavior | `hooks/useColumnPreferences.js` and `utils/columnUtils.js` |
| Change CSV/JSON output | `utils/exportUtils.js` and `hooks/useReportExport.js` |
| Change report tabs or page coordination | `ProgressReport.jsx` |
| Change table cells or row actions | `ProgressReportTable.jsx` |
| Change toolbar controls | `components/ProgressReportToolbar.jsx` |
| Change filter controls | `components/ProgressReportFilterBar.jsx` |

## Adding a Report Field

1. Add metadata to the maternal or child field library in `progressReportUtils.js`.
2. Add the normalized property in `normalizeMother` or `normalizeChild`.
3. Confirm `buildRequestFields` requests the backend field.
4. Add a server allowlist entry when the API uses field selection.
5. Add special rendering to `ProgressReportTable` only when the field is not plain text, progress, trend, or a date.
6. Add special export conversion to `getRowValue` only when the row value is not directly exportable.

## Adding a Search Filter

1. Add a rule to `SEARCH_FILTER_RULES` with an ID, pattern, label, and optional label function.
2. Add a matching branch in `filterRows` for filters that need more than a boolean field check.
3. Add a quick-filter button in `ProgressReportFilterBar` only when the filter should be prominent.
4. Check that `parseQuery` removes the token and preserves the remaining free-text query.
5. Verify active filter counts and chip removal.

## Changing Data Fetching

`useReportData` has two paths:

- Mothers: call `refreshMothers(selectedFields)` from `MothersContext`; this fetches fresh records from `/api/mothers`.
- Children: call `apiGetChildren(selectedFields)` and update local child state.

Both paths use the hook's `loadingData` result. Keep loading and empty-state handling tied to that value so an old context snapshot is not presented as the result of a newer request.

Do not fetch directly from `ProgressReportTable` or filter components. Keep API field construction in `buildRequestFields`, and keep API-to-report transformation in the normalizers.

## Changing Progress or Ranking

Normalized rows must provide the fields consumed by the page and utilities, including:

```text
id, name, type, school/community, group, batch,
progress, trend, source
```

`useReportData` aggregates rows by group and batch for Ranked by. The Ranked by selector uses visible managed numeric columns to calculate each aggregate average; Progress % is the fallback. It also chooses an aggregate trend from member trends. Graph View uses managed visible fields such as Age, Gender, BMI, and Progress, with bar, line, or pie chart modes and progress/community/group/batch grouping. The School filter is the community filter for graph data.

## Export Behavior

`useReportExport` selects rows and columns for the active view and provides a 20-row preview. `getExportData` defines the export schema:

- Master List: currently visible entity columns.
- Ranked by: entity, type, members, progress, trend, sorted by the selected managed attribute.
- Graph View: range, count, share.

`exportReport` appends the current date to the filename and downloads CSV or JSON. Keep CSV escaping in `generateCsvContent`; do not build CSV elsewhere.

## Column Preferences

Preferences are scoped by role and entity type:

```text
progress-report-columns-{roleName}-{beneficiaryType}
```

When fields change, `mergeColumnPreferences` removes invalid saved IDs and applies new defaults. Preserve `name` as a usable identity column when changing visibility rules.

## Validation Checklist

Run:

```text
npm run build
```

Then check:

- Mothers and Children switch correctly and display the correct data.
- School, group, batch, text, and quick filters compose correctly.
- All report tabs render rows or graph data without empty-state regressions.
- Column changes persist after refresh and remain valid after switching entity type.
- CSV and JSON exports use the selected view and columns.
- Loading and empty states remain visible while child data is requested.

## Known Implementation Notes

- Graph View is rendered in `ProgressReport.jsx`; `graphRows` is prepared by `useReportData` for export.
- `useReportData` accepts `getFieldGroupsFn` but does not currently use it. Remove that prop only with a coordinated caller change.
- `window.__progressReportFields` is a development inspection aid written by `useReportData`; do not use it as application state.
