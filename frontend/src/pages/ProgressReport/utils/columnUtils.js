/**
 * columnUtils.js
 * Pure functions for managing visible columns and persistence
 * Responsibility: Save/load preferences, compute defaults, filter columns
 */

/**
 * Load column preferences from localStorage
 */
export const loadColumnPreferences = (storageKey, currentEntityColumns, defaultColumns) => {
  try {
    const savedValue = localStorage.getItem(storageKey);
    if (savedValue) {
      const parsed = JSON.parse(savedValue);
      if (Array.isArray(parsed) && parsed.length) {
        const validColumns = parsed.filter((id) =>
          currentEntityColumns.some((column) => column.id === id)
        );
        const guaranteedColumns = [...new Set(['name', ...validColumns])];
        if (guaranteedColumns.length > 0) {
          return guaranteedColumns;
        }
      }
    }
  } catch (error) {
    console.warn('[ColumnPreferences] Unable to read saved preferences:', error);
  }

  return defaultColumns;
};

/**
 * Save column preferences to localStorage
 */
export const saveColumnPreferences = (storageKey, columns) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(columns));
  } catch (error) {
    console.warn('[ColumnPreferences] Unable to save preferences:', error);
  }
};

/**
 * Merge loaded columns with defaults and ensure 'name' is always present
 */
export const mergeColumnPreferences = (current, next, currentEntityColumns) => {
  const merged = current.filter((id) =>
    currentEntityColumns.some((column) => column.id === id)
  );

  const safeColumns = [...new Set(['name', ...merged, ...next])];

  return merged.length ? safeColumns : next;
};

/**
 * Get all columns grouped by category
 */
export const getColumnsByCategory = (columns, categories) => {
  return categories.map((category) => ({
    category,
    columns: columns.filter((col) => col.category === category),
  }));
};

/**
 * Filter columns by search query
 */
export const filterColumnsBySearch = (columns, query, categoryMap) => {
  if (!query.trim()) {
    return categoryMap.map((group) => ({
      ...group,
      items: group.columns,
    }));
  }

  const lowerQuery = query.toLowerCase();

  return categoryMap
    .map((group) => ({
      group: group.category,
      items: group.columns.filter(
        (column) =>
          column.label.toLowerCase().includes(lowerQuery) ||
          column.id.toLowerCase().includes(lowerQuery)
      ),
    }))
    .filter((entry) => entry.items.length > 0);
};

/**
 * Compute which columns are visible and which are hidden
 */
export const getColumnVisibility = (visibleColumns, allColumns) => {
  return allColumns.map((column) => ({
    ...column,
    isVisible: visibleColumns.includes(column.id),
  }));
};

/**
 * Toggle a column's visibility
 */
export const toggleColumnVisibility = (columnId, visibleColumns, isSingleNameColumn = false) => {
  // Prevent unchecking 'name' if it's guaranteed to be visible
  if (isSingleNameColumn && columnId === 'name') {
    return visibleColumns;
  }

  return visibleColumns.includes(columnId)
    ? visibleColumns.filter((id) => id !== columnId)
    : [...visibleColumns, columnId];
};

/**
 * Check all columns in a category
 */
export const checkCategoryColumns = (categoryName, columns, visibleColumns) => {
  const categoryColumns = columns
    .filter((col) => col.category === categoryName)
    .map((col) => col.id);

  return [...new Set([...visibleColumns, ...categoryColumns])];
};

/**
 * Uncheck all columns in a category (except 'name')
 */
export const uncheckCategoryColumns = (categoryName, columns, visibleColumns) => {
  const categoryColumns = columns
    .filter((col) => col.category === categoryName && col.id !== 'name')
    .map((col) => col.id);

  return visibleColumns.filter((id) => !categoryColumns.includes(id));
};

/**
 * Get initialization state for expandable category groups
 */
export const getInitialExpandedGroups = (categoryNames) => {
  return Object.fromEntries(categoryNames.map((name) => [name, true]));
};
