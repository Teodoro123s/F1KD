/**
 * exportUtils.js - CSV/JSON Export Generation & Download Utilities
 * 
 * RESPONSIBILITY: Format and generate export files (CSV/JSON), create download blobs,
 * handle file downloads, and provide preview data extraction.
 * 
 * ARCHITECTURE LAYER: Business Logic Layer (Pure Functions)
 * - No React dependencies ✓
 * - No component rendering ✓
 * - Fully unit-testable ✓
 * - Reusable for any data export ✓
 * 
 * FEATURES:
 *   - CSV export with proper escaping (RFC 4180 compliant)
 *   - JSON export with pretty-printing
 *   - Automatic blob creation and file downloads
 *   - Format-agnostic export function
 *   - Preview data extraction (first N rows)
 *   - Multiple view modes (Master List, Summary View, Graph View, Ranked List)
 * 
 * USAGE:\n *   const csv = generateCsvContent(rows, columns, getValueFn);\n *   downloadContent(csv, 'export.csv', 'text/csv');\n *   const preview = getExportPreviewRows(rows, 20);\n * \n * EXPORTS:\n *   - getRowValue(row, fieldId)\n *   - generateCsvContent(rows, columns, getValueFn)\n *   - generateJsonContent(rows, columns, getValueFn)\n *   - downloadContent(content, filename, mimeType)\n *   - exportReport(rows, columns, format, filename, getValueFn)\n *   - getExportPreviewRows(rows, previewCount)\n *   - getExportData(rows, viewMode, rankedRows, graphRows)\n */

/**
 * Get the value from a row for a given field ID
 * 
 * @param {Object} row - Data row object\n * @param {string} fieldId - Field identifier\n * @returns {*} Value from row[fieldId] or empty string\n */
const getRowValue = (row, fieldId) => {
  if (fieldId === 'name') return row.name ?? '';
  if (fieldId === 'type') return row.type ?? '';
  if (fieldId === 'idLabel') return row.idLabel ?? '';
  if (fieldId === 'progress') return `${row.progress ?? 0}%`;
  if (fieldId === 'trend') return row.trend === 'up' ? '↗' : '↘';
  if (fieldId === 'range') return row.range ?? '';
  if (fieldId === 'count') return row.count ?? 0;
  if (fieldId === 'share') return `${row.share ?? 0}%`;
  return row[fieldId] ?? '';
};

/**
 * Escape CSV field value
 */
const escapeCsvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

/**
 * Generate CSV content as string
 */
export const generateCsvContent = (rows, columns) => {
  const lines = [columns.map((column) => escapeCsvValue(column.label)).join(',')];

  rows.forEach((row) => {
    lines.push(columns.map((column) => escapeCsvValue(getRowValue(row, column.id))).join(','));
  });

  return lines.join('\n');
};

/**
 * Generate JSON content as string
 */
export const generateJsonContent = (rows, columns) => {
  const payload = rows.map((row) => {
    const entry = {};
    columns.forEach((column) => {
      entry[column.label] = getRowValue(row, column.id);
    });
    return entry;
  });

  return JSON.stringify(payload, null, 2);
};

/**
 * Create a download link for the given content and filename
 */
export const downloadContent = (content, filename, mimeType) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type: mimeType }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

/**
 * Orchestrate export: format content, create blob, download
 */
export const exportReport = ({
  rows,
  columns,
  filename = 'progress-report',
  format = 'CSV',
}) => {
  const timestamp = new Date().toISOString().slice(0, 10);
  const safeFilename = `${filename}-${timestamp}`;

  if (format === 'JSON') {
    const content = generateJsonContent(rows, columns);
    downloadContent(content, `${safeFilename}.json`, 'application/json;charset=utf-8');
  } else {
    const content = generateCsvContent(rows, columns);
    downloadContent(content, `${safeFilename}.csv`, 'text/csv;charset=utf-8');
  }
};

/**
 * Get preview rows for export (first 20)
 */
export const getExportPreviewRows = (rows, limit = 20) => rows.slice(0, limit);

/**
 * Determine which rows and columns to use based on view mode
 */
export const getExportData = ({
  viewMode,
  masterRows,
  rankedRows,
  summaryRows,
  graphRows,
  visibleColumns,
  currentEntityColumns,
}) => {
  let rows, columns;

  switch (viewMode) {
    case 'Summary View':
      rows = summaryRows;
      columns = [
        { id: 'name', label: 'Entity' },
        { id: 'type', label: 'Type' },
        { id: 'idLabel', label: 'Members' },
        { id: 'progress', label: 'Average Progress' },
        { id: 'trend', label: 'Trend' },
      ];
      break;

    case 'Graph View':
      rows = graphRows;
      columns = [
        { id: 'range', label: 'Range' },
        { id: 'count', label: 'Count' },
        { id: 'share', label: 'Share (%)' },
      ];
      break;

    case 'Ranked List':
      rows = rankedRows;
      columns = [
        { id: 'name', label: 'Entity' },
        { id: 'type', label: 'Type' },
        { id: 'idLabel', label: 'Members' },
        { id: 'progress', label: 'Progress %' },
        { id: 'trend', label: 'Trend' },
      ];
      break;

    default:
      rows = masterRows;
      columns = currentEntityColumns.filter((column) => visibleColumns.includes(column.id));
  }

  return { rows, columns };
};
