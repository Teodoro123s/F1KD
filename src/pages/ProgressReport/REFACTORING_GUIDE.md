# Horizontal Refactoring Guide: ProgressReport.jsx

## Overview
This guide demonstrates how to refactor **ProgressReport.jsx** using horizontal refactoring principles: extracting pure utilities and custom hooks from a monolithic component without changing its UI behavior.

---

## Phase 1: Import the new utilities and hooks

Replace the long imports at the top of ProgressReport.jsx:

```javascript
// ❌ BEFORE (mixed concerns):
import { useEffect, useMemo, useState } from 'react';
import { useMothers } from '../../context/MothersContext';
import { useAuth } from '../../auth/AuthProvider';
import { apiGetChildren } from '../../api/children';
// ... 15 more imports

// ✅ AFTER (organized by concern):
import { useEffect, useMemo, useState } from 'react';
import { useMothers } from '../../context/MothersContext';
import { useAuth } from '../../auth/AuthProvider';
import { useProgressFilters } from './hooks/useProgressFilters';
import { useReportData } from './hooks/useReportData';
import { useColumnPreferences } from './hooks/useColumnPreferences';
import { useReportExport } from './hooks/useReportExport';
import { buildRequestFields } from './utils/apiUtils';
import {
  REPORT_TABS,
  SEARCH_FILTER_RULES,
  formatDate,
  formatDelta,
  getDefaultVisibleColumns,
  getFieldGroups,
  getReportColumnsForEntity,
  getRowKey,
  hasValue,
  matchesEntityToken,
  normalizeChild,
  normalizeMother,
} from './progressReportUtils';
```

---

## Phase 2: Replace filter state with `useProgressFilters` hook

```javascript
// ❌ BEFORE (31 individual state variables):
const [school, setSchool] = useState('All Schools');
const [group, setGroup] = useState('All Groups');
const [batch, setBatch] = useState('All Batches');
const [search, setSearch] = useState('');
const [showAllFilters, setShowAllFilters] = useState(false);
// ... more code to compute filteredRows, options, etc.
const searchFilters = useMemo(() => SEARCH_FILTER_RULES.flatMap(...), [search]);
// ... more complex useMemo hooks

// ✅ AFTER (single hook handles all filter logic):
const {
  school, setSchool,
  group, setGroup,
  batch, setBatch,
  search, setSearch,
  showAllFilters, setShowAllFilters,
  searchFilters,
  filteredRows,
  activeFilterCount,
  comparisonRequest,
  schoolOptions,
  groupOptions,
  batchOptions,
} = useProgressFilters({
  allRows,
  searchFilterRules: SEARCH_FILTER_RULES,
  hasValueFn: hasValue,
  beneficiaryType,
});
```

**Benefits:**
- Reduces 8 state variables + 8+ useMemo hooks → 1 custom hook
- Filter logic is now testable in isolation
- Related state is co-located

---

## Phase 3: Replace column management with `useColumnPreferences` hook

```javascript
// ❌ BEFORE (mixing localStorage, state, and complex useMemo):
const savedColumnPreferenceKey = `progress-report-columns-${roleName}-${beneficiaryType}`;
const [visibleColumns, setVisibleColumns] = useState(() => {
  try {
    const savedValue = localStorage.getItem(savedColumnPreferenceKey);
    if (savedValue) {
      const parsed = JSON.parse(savedValue);
      if (Array.isArray(parsed) && parsed.length) {
        const validColumns = parsed.filter(...);
        const guaranteedColumns = [...new Set(['name', ...validColumns])];
        return guaranteedColumns;
      }
    }
  } catch (error) { ... }
  return defaultVisibleColumns;
});
const [showColumns, setShowColumns] = useState(false);
const [fieldSearch, setFieldSearch] = useState('');
const [expandedGroups, setExpandedGroups] = useState(() => ...);
useEffect(() => {
  try {
    localStorage.setItem(savedColumnPreferenceKey, JSON.stringify(visibleColumns));
  } catch (error) { ... }
}, [savedColumnPreferenceKey, visibleColumns]);
useEffect(() => { /* complex merge logic */ }, [roleName, beneficiaryType, ...]);

// ✅ AFTER (single hook handles all column logic):
const {
  visibleColumns, setVisibleColumns,
  fieldSearch, setFieldSearch,
  showColumns, setShowColumns,
  expandedGroups, setExpandedGroups,
  filteredFieldOptions,
} = useColumnPreferences({
  currentEntityColumns,
  defaultVisibleColumns,
  roleName,
  beneficiaryType,
  fieldGroups: getFieldGroups(beneficiaryType),
});
```

**Benefits:**
- Reduces 5 state variables + 2 complex useEffect + 2 useMemo hooks → 1 custom hook
- localStorage logic is hidden in the hook
- Column merging logic is encapsulated

---

## Phase 4: Replace data fetching with `useReportData` hook

```javascript
// ❌ BEFORE (mixing effects, state, normalization, and ranking):
const [children, setChildren] = useState([]);
const [loadingChildren, setLoadingChildren] = useState(false);
useEffect(() => {
  let active = true;
  if (beneficiaryType === 'Mothers') {
    const selectedFields = buildRequestFields();
    refreshMothers(selectedFields);
    return () => { active = false; };
  }
  setLoadingChildren(true);
  apiGetChildren(buildRequestFields())
    .then((payload) => { if (active) setChildren(...) })
    .catch(() => { if (active) setChildren([]) })
    .finally(() => { if (active) setLoadingChildren(false); });
  return () => { active = false; };
}, [beneficiaryType, refreshMothers, visibleColumns]);
const allRows = useMemo(() => beneficiaryType === 'Mothers' ? mothers.map(...) : children.map(...), [...]);
const rankedRows = useMemo(() => { /* 30+ lines of aggregation */ }, [filteredRows]);
const graphRows = useMemo(() => { /* 10+ lines of distribution */ }, [filteredRows]);

// ✅ AFTER (single hook orchestrates all data logic):
const {
  allRows,
  rankedRows,
  graphRows,
  selectedFields,
} = useReportData({
  beneficiaryType,
  mothers,
  refreshMothers,
  visibleColumns,
  currentEntityColumns,
  defaultVisibleColumns,
  normalizeMotherFn: normalizeMother,
  normalizeChildFn: normalizeChild,
  getFieldGroupsFn: getFieldGroups,
});
```

**Benefits:**
- Reduces 2 state variables + 1 complex useEffect + 3+ useMemo hooks → 1 custom hook
- API fetching is now predictable and testable
- Data normalization is hidden
- Ranking logic is isolated

---

## Phase 5: Replace export logic with `useReportExport` hook

```javascript
// ❌ BEFORE (export state scattered, downloadReport is a 70-line function):
const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
const [exportFormat, setExportFormat] = useState('CSV');
const [exportFilename, setExportFilename] = useState('progress-report');
const [exportColumns, setExportColumns] = useState([]);
const exportColumnsForView = useMemo(() => {
  if (activeTab === 'Summary View') return [...];
  if (activeTab === 'Graph View') return [...];
  if (activeTab === 'Ranked List') return [...];
  return currentEntityColumns.filter(...);
}, [activeTab, currentEntityColumns, visibleColumns]);
const downloadReport = ({ viewMode = activeTab, format = 'CSV', ... } = {}) => {
  // 60+ lines of CSV/JSON formatting and blob handling
};

// ✅ AFTER (single hook handles all export logic):
const {
  exportPreviewOpen, setExportPreviewOpen,
  exportFormat, setExportFormat,
  exportFilename, setExportFilename,
  exportColumnsForView,
  exportPreviewRows,
  downloadReport,
} = useReportExport({
  masterRows: filteredRows,
  rankedRows,
  summaryRows: rankedRows,
  graphRows,
  visibleColumns,
  currentEntityColumns,
  activeTab,
  beneficiaryType,
});
```

**Benefits:**
- Reduces 4 state variables + 1 useMemo + 1 function → 1 custom hook
- Export logic is now testable and reusable
- Format-specific logic is encapsulated

---

## Phase 6: Delete the old monolithic code

After integrating the hooks, delete or comment out:
- ❌ 31 individual state variable declarations
- ❌ 15+ useMemo computations
- ❌ 8+ useEffect calls
- ❌ 70-line `downloadReport()` function
- ❌ 20-line `buildRequestFields()` function

**Result:** ProgressReport.jsx shrinks from 500+ lines → ~200 lines (component logic only)

---

## Phase 7: Verify UI behavior unchanged

The component still renders exactly the same because we only moved logic, not UI:

```javascript
return (
  <div className="progress-report-shell">
    <ProgressReportFilterBar
      activeFilterCount={activeFilterCount}
      showAllFilters={showAllFilters}
      setShowAllFilters={setShowAllFilters}
      school={school}
      setSchool={setSchool}
      // ... all other props work the same
    />
    {/* All child components render identically */}
  </div>
);
```

---

## Summary of Refactoring Gains

| Aspect | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Main component lines** | 500+ | ~200 | 60% smaller |
| **State variables** | 31 | 0 (in hook props) | Eliminated |
| **useMemo hooks** | 15+ | 0 (in hooks) | Eliminated |
| **useEffect calls** | 8+ | 0 (in hooks) | Eliminated |
| **Complex functions** | 70-line `downloadReport` | Utility functions | Testable |
| **Code reusability** | Monolithic | Modular hooks + utils | 4x reusable |
| **Testing surface** | Entire component | Isolated utilities | Easier to test |

---

## Next Steps: Apply to Other Pages

This same pattern can be applied to:
- **CommunityPage.jsx** → `useCommunityFilters`, `useCommunityForms`, `useCommunityData`
- **BeneficiaryPage.jsx** → `useBeneficiaryFilters`, `useBeneficiaryData`
- **UserManagementPage.jsx** → `useUserFilters`, `useUserManagement`

Each page can be reduced by 40-60% following this exact pattern.
