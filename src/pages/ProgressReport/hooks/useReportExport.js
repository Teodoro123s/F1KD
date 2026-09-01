/**
 * useReportExport.js
 * Custom hook for managing export state and logic
 * Responsibility: Manage export preview, format selection, handle downloads
 */

import { useState, useMemo } from 'react';
import { getExportData, getExportPreviewRows, exportReport } from '../utils/exportUtils';

export const useReportExport = ({
  masterRows,
  rankedRows,
  summaryRows,
  graphRows,
  visibleColumns,
  currentEntityColumns,
  activeTab,
  beneficiaryType,
}) => {
  // Export state
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('CSV');
  const [exportFilename, setExportFilename] = useState('progress-report');

  // Get columns for the active view mode
  const exportColumnsForView = useMemo(() => {
    const { columns } = getExportData({
      viewMode: activeTab,
      masterRows,
      rankedRows,
      summaryRows,
      graphRows,
      visibleColumns,
      currentEntityColumns,
    });
    return columns;
  }, [activeTab, masterRows, rankedRows, summaryRows, graphRows, visibleColumns, currentEntityColumns]);

  // Get preview rows for the active view mode
  const exportPreviewRows = useMemo(() => {
    const { rows } = getExportData({
      viewMode: activeTab,
      masterRows,
      rankedRows,
      summaryRows,
      graphRows,
      visibleColumns,
      currentEntityColumns,
    });
    return getExportPreviewRows(rows, 20);
  }, [activeTab, masterRows, rankedRows, summaryRows, graphRows, visibleColumns, currentEntityColumns]);

  // Orchestrate the download
  const downloadReport = (options = {}) => {
    const { viewMode = activeTab, format = exportFormat, filename = exportFilename } = options;

    const { rows, columns } = getExportData({
      viewMode,
      masterRows,
      rankedRows,
      summaryRows,
      graphRows,
      visibleColumns,
      currentEntityColumns,
    });

    exportReport({
      rows,
      columns,
      filename: filename || `progress-report-${beneficiaryType.toLowerCase()}`,
      format,
    });
  };

  return {
    // State
    exportPreviewOpen,
    setExportPreviewOpen,
    exportFormat,
    setExportFormat,
    exportFilename,
    setExportFilename,
    // Computed
    exportColumnsForView,
    exportPreviewRows,
    // Actions
    downloadReport,
  };
};
