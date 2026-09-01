/**
 * useColumnPreferences.js
 * Custom hook for managing column visibility and persistence
 * Responsibility: Load/save preferences, compute merged defaults, manage UI state
 */

import { useState, useEffect, useMemo } from 'react';
import {
  loadColumnPreferences,
  saveColumnPreferences,
  mergeColumnPreferences,
  getInitialExpandedGroups,
} from '../utils/columnUtils';

export const useColumnPreferences = ({
  currentEntityColumns,
  defaultVisibleColumns,
  roleName,
  beneficiaryType,
  fieldGroups,
}) => {
  const storageKey = `progress-report-columns-${roleName}-${beneficiaryType}`;

  // Initialize from storage or defaults
  const [visibleColumns, setVisibleColumns] = useState(() =>
    loadColumnPreferences(storageKey, currentEntityColumns, defaultVisibleColumns)
  );

  // Manage column search UI
  const [fieldSearch, setFieldSearch] = useState('');
  const [showColumns, setShowColumns] = useState(false);

  // Manage expandable groups
  const [expandedGroups, setExpandedGroups] = useState(() =>
    getInitialExpandedGroups(fieldGroups)
  );

  // Persist to localStorage whenever columns change
  useEffect(() => {
    saveColumnPreferences(storageKey, visibleColumns);
  }, [storageKey, visibleColumns]);

  const fieldGroupsKey = fieldGroups.join('|');
  const currentEntityColumnsKey = currentEntityColumns.map((column) => column.id).join('|');
  const defaultVisibleColumnsKey = defaultVisibleColumns.join('|');

  // Merge defaults when role or entity type changes
  useEffect(() => {
    const nextDefaults = defaultVisibleColumns;
    setVisibleColumns((current) =>
      mergeColumnPreferences(current, nextDefaults, currentEntityColumns)
    );
    setExpandedGroups(getInitialExpandedGroups(fieldGroups));
  }, [roleName, beneficiaryType, defaultVisibleColumnsKey, currentEntityColumnsKey, fieldGroupsKey]);

  // Filter columns by search
  const filteredFieldOptions = useMemo(() => {
    const query = fieldSearch.trim().toLowerCase();

    return fieldGroups
      .map((group) => ({
        group,
        items: currentEntityColumns.filter(
          (column) =>
            column.category === group &&
            (!query ||
              column.label.toLowerCase().includes(query) ||
              column.id.toLowerCase().includes(query))
        ),
      }))
      .filter((entry) => entry.items.length > 0);
  }, [currentEntityColumns, fieldSearch, fieldGroups]);

  return {
    // State
    visibleColumns,
    setVisibleColumns,
    fieldSearch,
    setFieldSearch,
    showColumns,
    setShowColumns,
    expandedGroups,
    setExpandedGroups,
    // Computed
    filteredFieldOptions,
    storageKey,
  };
};
