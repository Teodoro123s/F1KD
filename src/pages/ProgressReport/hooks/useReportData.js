/**
 * useReportData.js
 * Custom hook for managing data fetching and row transformations
 * Responsibility: Fetch mothers/children, normalize data, compute rankings
 */

import { useEffect, useMemo, useState } from 'react';
import { apiGetChildren } from '../../../api/children';
import { buildRequestFields } from '../utils/apiUtils';

export const useReportData = ({
  beneficiaryType,
  mothers,
  refreshMothers,
  visibleColumns,
  currentEntityColumns,
  defaultVisibleColumns,
  normalizeMotherFn,
  normalizeChildFn,
  getFieldGroupsFn,
}) => {
  const [children, setChildren] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  // Build the list of fields to fetch
  const selectedFields = useMemo(
    () => buildRequestFields(visibleColumns, currentEntityColumns, defaultVisibleColumns),
    [visibleColumns, currentEntityColumns, defaultVisibleColumns]
  );

  // Fetch data when beneficiary type or fields change
  useEffect(() => {
    let active = true;

    if (beneficiaryType === 'Mothers') {
      refreshMothers(selectedFields);
      return () => {
        active = false;
      };
    }

    setLoadingChildren(true);
    apiGetChildren(selectedFields)
      .then((payload) => {
        if (active) {
          setChildren(Array.isArray(payload) ? payload : payload?.children || []);
        }
      })
      .catch(() => {
        if (active) {
          setChildren([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingChildren(false);
        }
      });

    return () => {
      active = false;
    };
  }, [beneficiaryType, refreshMothers, selectedFields]);

  // Normalize all rows
  const allRows = useMemo(
    () =>
      beneficiaryType === 'Mothers'
        ? mothers.map(normalizeMotherFn)
        : children.map(normalizeChildFn),
    [beneficiaryType, children, mothers, normalizeMotherFn, normalizeChildFn]
  );

  // Compute ranked rows (grouped by group and batch)
  const rankedRows = useMemo(() => {
    const aggregate = (field, label) =>
      Object.entries(
        allRows.reduce((groups, row) => {
          const key = row[field] || `Unassigned ${label}`;
          groups[key] = groups[key] || [];
          groups[key].push(row);
          return groups;
        }, {})
      ).map(([name, rows]) => ({
        id: `${label}-${name}`,
        name: `${label}: ${name}`,
        idLabel: `${rows.length} beneficiaries`,
        trimester: label,
        assessment: 'Current cohort',
        progress: Math.round(rows.reduce((total, row) => total + row.progress, 0) / rows.length),
        trend: rows.filter((row) => row.trend === 'up').length >= rows.length / 2 ? 'up' : 'down',
        memberIds: rows.map((row) => row.id),
        type: label,
      }));

    return [...aggregate('group', 'Group'), ...aggregate('batch', 'Batch')];
  }, [allRows]);

  // Compute graph rows (progress distribution)
  const graphRows = useMemo(
    () =>
      ['0-25%', '26-50%', '51-75%', '76-100%'].map((range, index) => ({
        range,
        count: allRows.filter(
          (row) =>
            row.progress >= index * 25 && row.progress <= (index + 1) * 25
        ).length,
        share: allRows.length
          ? (allRows.filter(
              (row) =>
                row.progress >= index * 25 && row.progress <= (index + 1) * 25
            ).length /
              allRows.length) *
            100
          : 0,
      })),
    [allRows]
  );

  // Store in window for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__progressReportFields = selectedFields;
    }
  }, [selectedFields]);

  return {
    // Data
    allRows,
    rankedRows,
    graphRows,
    mothers,
    children,
    // Loading state
    loadingChildren,
    // Computed
    selectedFields,
  };
};
