# Horizontal Refactoring Notes

## Purpose

This document captures the refactoring approach and the reusable patterns that were introduced for the ProgressReport, Community, and Beneficiary flows.

## Reference Files

- [src/pages/ProgressReport/hooks/useProgressFilters.js](src/pages/ProgressReport/hooks/useProgressFilters.js)
- [src/pages/ProgressReport/hooks/useReportData.js](src/pages/ProgressReport/hooks/useReportData.js)
- [src/pages/ProgressReport/hooks/useColumnPreferences.js](src/pages/ProgressReport/hooks/useColumnPreferences.js)
- [src/pages/ProgressReport/hooks/useReportExport.js](src/pages/ProgressReport/hooks/useReportExport.js)
- [src/pages/ProgressReport/utils/filterUtils.js](src/pages/ProgressReport/utils/filterUtils.js)
- [src/pages/ProgressReport/utils/apiUtils.js](src/pages/ProgressReport/utils/apiUtils.js)
- [src/pages/ProgressReport/utils/exportUtils.js](src/pages/ProgressReport/utils/exportUtils.js)
- [src/pages/ProgressReport/utils/columnUtils.js](src/pages/ProgressReport/utils/columnUtils.js)

## Current Guidance

- Keep UI rendering in page components and move state orchestration into hooks.
- Keep pure transformation and validation logic in utility files.
- Reuse the same pattern across pages when similar filtering, search, and form logic appears again.
- Treat User Management as a reference for the current optimized structure and avoid unnecessary duplication.

## Integration Pattern

```javascript
export default function ProgressReport() {
  const { mothers } = useMothers();
  const { allRows, rankedRows, graphRows } = useReportData({ mothers });
  const { filteredRows, search, setSearch } = useProgressFilters({ rows: allRows });

  return <ProgressReportTable rows={filteredRows} />;
}
```

This keeps the page readable while separating data orchestration from presentation logic.
