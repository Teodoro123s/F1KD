# ProgressReport Refactoring - Architecture & Implementation Guide

## 🏗️ Architecture Overview

### Layer Architecture (6-Layer Pattern)

The refactored ProgressReport follows a clean, layered architecture that separates concerns and enables testing at each level:

```
┌─────────────────────────────────────────────┐
│  Layer 1: Presentation (JSX Rendering)      │
│  ProgressReport.jsx - UI composition only    │
│  - No business logic                         │
│  - No state management except UI state      │
│  - Calls hooks and renders components       │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│  Layer 2: State Orchestration (Hooks)       │
│  useProgressFilters.js                       │
│  useReportData.js                           │
│  useColumnPreferences.js                    │
│  useReportExport.js                         │
│  - Composes pure functions                  │
│  - Manages React state                      │
│  - Handles side effects (useEffect)         │
│  - Returns organized state + methods        │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│  Layer 3: Business Logic (Pure Utils)       │
│  filterUtils.js - Parse and apply filters   │
│  apiUtils.js - Build API payloads           │
│  exportUtils.js - Generate CSV/JSON         │
│  columnUtils.js - Manage column state       │
│  - Pure functions (no side effects)         │
│  - No React dependencies                    │
│  - Fully unit-testable                      │
│  - Reusable across components               │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│  Layer 4: API & Context                     │
│  - useAuth() - Authentication context      │
│  - useMothers() - Beneficiary context       │
│  - apiGetChildren() - Data fetching         │
│  - localStorage - Persistence               │
└─────────────────────────────────────────────┘
```

---

## 📊 File Structure

```
src/pages/ProgressReport/
├── ProgressReport.jsx                 # Layer 1: Main component (thin composition)
├── progressReportUtils.js             # Constants, normalizers, helpers
├── ProgressReportTable.jsx            # Sub-component: Table rendering
├── ProgressReportToolbar.jsx          # Sub-component: Toolbar
├── ProgressReportFilterBar.jsx        # Sub-component: Filter bar
├── ProgressReportComparisonModal.jsx  # Sub-component: Comparison modal
│
├── utils/                             # Layer 3: Business Logic
│   ├── filterUtils.js                 # ⭐ Parse & apply filters
│   ├── apiUtils.js                    # ⭐ Build API payloads
│   ├── exportUtils.js                 # ⭐ Generate CSV/JSON
│   └── columnUtils.js                 # ⭐ Column preference management
│
├── hooks/                             # Layer 2: State Orchestration
│   ├── useProgressFilters.js          # ⭐ Filter state + computed values
│   ├── useReportData.js               # ⭐ Data fetching + normalization
│   ├── useColumnPreferences.js        # ⭐ Column visibility + persistence
│   └── useReportExport.js             # ⭐ Export workflow orchestration
│
├── components/                        # Layer 1: Focused UI components
│   ├── ProgressReportToolbar.jsx
│   ├── ProgressReportFilterBar.jsx
│   ├── ProgressReportComparisonModal.jsx
│   └── ...
│
└── REFACTORING_GUIDE.md               # Documentation (this file)
```

---

## 🧭 Safe Implementation Order (Non-Breaking)

The refactor should happen in this exact order to avoid regressions while keeping the page functional at each step.

### Week 1: Extract `utils/helpers.js` and `utils/fieldSanitizer.js`
- Move pure logic such as normalization, value coercion, and field cleanup to utility modules.
- Update the router or page entry point to import from these modules.
- Keep behavior identical; this is a no-risk refactor because the code remains side-effect free.

### Week 2: Extract `repositories/childRepository.js`
- Move all `pool.query` or database calls out of the route/controller.
- Keep the endpoint contract and response shapes unchanged.
- Test each endpoint to confirm the repository layer is behaviorally equivalent.

### Week 3: Extract `services/childService.js`
- Move business logic into a service layer: progress calc, trend calc, enrichment, and aggregation.
- The repository returns raw rows; the service transforms them into the contract used by UI logic.
- This is the first place where logic can be unit tested independently.

### Week 4: Thin router/controller layer
- The route should only parse `req`/`res`, validate input, and call a controller or service.
- Hide transport concerns from the business logic.
- This leaves the endpoint as a thin orchestration surface.

### Week 5: Add Query Builder and NLP Parser
- Support dynamic filtering from the frontend search bar and column management UI.
- The Query Builder handles structured filters such as school, group, and batch.
- The NLP Parser converts natural-language search patterns into filter objects.
- This final layer enables advanced `/children` endpoints without affecting the earlier layers.

### The Bottom Line
This layered architecture keeps each concern isolated:
- Presentation: render only
- State orchestration: hooks and UI state
- Business logic: pure services and utilities
- Persistence: repositories and queries
- Controller: request/response boundary

The result is code that is easier to maintain, easier to test, and easier to extend for Summary View, Graph View, and comparison dashboards without rewriting the UI layer.

---

## 🔄 Data Flow

### Request → Filter → Display

```
User Input (Filter/Search)
         ↓
ProgressReport.jsx (setState)
         ↓
useProgressFilters Hook
         ↓
filterUtils.parseContext() + parseQuery()
         ↓
filterUtils.filterRows()
         ↓
filteredRows → Rendered in Table
```

### Request → Fetch → Normalize → Display

```
Component Mount / Type Change
         ↓
useReportData Hook
         ↓
apiGetChildren() or refreshMothers()
         ↓
Normalize data (normalizeChild, normalizeMother)
         ↓
Calculate rankings + aggregations
         ↓
allRows, rankedRows, graphRows → Rendered
```

### Column Preference Persistence

```
User Toggles Column
         ↓
useColumnPreferences setVisibleColumns()
         ↓
columnUtils.saveColumnPreferences()
         ↓
localStorage.setItem()
         ↓
Next page load:
  localStorage.getItem() → columnUtils.loadColumnPreferences()
```

---

##  How to Extend (Add New Features)

### Example 1: Add "Summary View" for Administrators

**Step 1: Add to `filterUtils.js`**
```javascript
export const aggregateBySummary = (rows) => {
  return Object.entries(
    rows.reduce((groups, row) => {
      const key = row.school;
      groups[key] = groups[key] || [];
      groups[key].push(row);
      return groups;
    }, {})
  ).map(([school, members]) => ({
    school,
    totalMembers: members.length,
    averageProgress: Math.round(members.reduce((sum, r) => sum + r.progress, 0) / members.length),
    riskCount: members.filter(r => r.risk).length
  }));
};
```

**Step 2: Add to `useReportData.js`**
```javascript
const summaryRows = useMemo(() => {
  if (activeTab !== 'Summary View') return [];
  return aggregateBySummary(allRows);
}, [allRows, activeTab]);

return { ..., summaryRows };
```

**Step 3: Use in `ProgressReport.jsx`**
```javascript
const { summaryRows } = useReportData({...});

const displayedRows = activeTab === 'Summary View' 
  ? summaryRows 
  : filteredRows;
```

**No changes needed to:**
- filterUtils (reused)
- columnUtils (reused)
- exportUtils (can handle new data shape)
- Other components (data flows through same props)

### Example 2: Add Advanced Search (Date Range)

**Step 1: Update `filterUtils.parseQuery`**
```javascript
const dateRangePattern = /\bdate:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})\b/i;
```

**Step 2: Add to `filterUtils.filterRows`**
```javascript
if (filter.id === 'search-date-range') {
  const [startDate, endDate] = filter.dates;
  return row.checkupDate >= startDate && row.checkupDate <= endDate;
}
```

**Step 3: Update `useProgressFilters` return**
```javascript
// No changes - already handles search parsing!
```

**Result:** New feature works without touching React component!

---

## 📝 Documentation Strategy

### File Headers
Every file has a header comment with:
- **Module Purpose**: What the file does
- **Layer**: Architecture layer
- **Dependencies**: What it imports
- **Exports**: What it provides
- **Usage**: Example of how to use it

### Function JSDoc
Every exported function has JSDoc with:
- **Description**: What it does
- **@param**: Parameter types and descriptions
- **@returns**: Return type and structure
- **@example**: Real usage example
- **@throws**: Errors it might throw (if applicable)

### Inline Comments
Complex logic has comments explaining:
- **Why** (not what) - the business reason
- **Trade-offs**: Performance vs. clarity decisions
- **Gotchas**: Edge cases or assumptions

---

## 🔐 Code Quality Checklist

- [x] **Pure Functions**: All utils are side-effect free
- [x] **No Circular Dependencies**: Utils → Hooks → Component (one direction)
- [x] **Single Responsibility**: Each function does one thing
- [x] **Testability**: 40+ pure functions, all unit-testable
- [x] **DRY Principle**: No duplicated filtering logic
- [x] **No Prop Drilling**: Hooks manage state directly
- [x] **Memoization**: Expensive computations cached with useMemo
- [x] **Error Handling**: Try-catch blocks where needed
- [x] **Performance**: Large datasets handled efficiently
- [x] **Accessibility**: ARIA labels preserved in components

---

## 🎯 Migration Path (For Other Pages)

To refactor other pages following this pattern:

### Week 1: Extract Utilities
1. Identify business logic functions (filtering, validation, transformation)
2. Create `utils/` folder
3. Extract to pure functions
4. Add JSDoc comments
5. Unit test

### Week 2: Extract Hooks
1. Identify state that can be grouped
2. Create hooks that compose utilities
3. Return organized objects
4. Add side effects (useEffect) to hooks

### Week 3: Simplify Component
1. Replace state declarations with hook calls
2. Delete useEffect calls (moved to hooks)
3. Delete utility functions (moved to utils/)
4. Verify rendering is identical

### Week 4: Optimize
1. Add memoization (useMemo, useCallback)
2. Split large components into sub-components
3. Performance profiling
4. Code review and testing

---

## 🔗 Related Files

- [TIER2_REFACTORING_GUIDE.md](TIER2_REFACTORING_GUIDE.md) - CommunityPage, UserManagementPage, BeneficiaryPage
- [INTEGRATION_COMPLETE.md](INTEGRATION_COMPLETE.md) - What was integrated and why
- [progressReportUtils.js](progressReportUtils.js) - Constants, normalizers, helpers

---

## 📚 Resources

- **React Hooks**: https://react.dev/reference/react/hooks
- **Pure Functions**: https://en.wikipedia.org/wiki/Pure_function
- **Separation of Concerns**: https://en.wikipedia.org/wiki/Separation_of_concerns
- **Testing Library**: https://testing-library.com/docs/react-testing-library/intro/

---

**Note:** This document is kept as an architecture reference and should be updated when the actual behavior of the page changes.
