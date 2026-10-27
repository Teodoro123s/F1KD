import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getBmiInterpretation } from '../progressReportConfig';
import FloatingLayer from '../../../components/ui/FloatingLayer';
import { filterInterpretationFields } from '../utils/reportTableUtils';
import { formatProfileReportCellValue } from '../utils/profileFieldFormatting.mjs';
import { filterProfileReportRows, getProfileReportScopeOptions } from '../utils/profileReportFilters.mjs';
import { buildMonitoringAverageRow } from '../utils/monitoringAverages.mjs';

const historyFieldIds = new Set(['measurementDate', 'weightForAge', 'heightForAge', 'bmiForAge', 'weightForLengthZScore', 'weightForLengthInterpretation', 'weightForAgeZScore', 'weightForAgeInterpretation', 'lengthForAgeZScore', 'lengthForAgeInterpretation', 'bmiInterpretation']);

const communityFieldsForSelection = (selection = {}) => {
  if (!selection.schoolId) return [];
  if (!selection.groupId) return [['group', 'Group'], ['batch', 'Batch']];
  if (!selection.batchId) return [['batch', 'Batch']];
  return [];
};

const isZScoreField = (field) => /ZScore$/i.test(field);
const isImplausibleZScore = (value) => {
  const score = Number(value);
  return Number.isFinite(score) && (score < -5 || score > 5);
};

const interpretationClass = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (!normalized) return '';
  const isNotNormal = /\bnot\s+(normal|within expected)\b/.test(normalized);
  return !isNotNormal && (/\bnormal\b/.test(normalized) || /\bwithin expected\b/.test(normalized))
    ? 'interpretation-normal'
    : 'interpretation-abnormal';
};

const interpretationForMetric = (row, field) => {
  if (field.endsWith('Interpretation')) return row[field];
  if (/^\d{4}-\d{2}$/.test(field)) return row[`${field}Interpretation`];
  const interpretationFields = {
    weightForLengthZScore: 'weightForLengthInterpretation',
    weightForAge: 'weightForAgeInterpretation',
    weightForAgeZScore: 'weightForAgeInterpretation',
    heightForAge: 'lengthForAgeInterpretation',
    lengthForAgeZScore: 'lengthForAgeInterpretation',
    bmiForAge: 'bmiInterpretation',
  };
  return row[interpretationFields[field]];
};

function HistoryCell({ field, value, formatCellValue, row }) {
  const formattedValue = formatCellValue(field, value);
  const warning = isZScoreField(field) && isImplausibleZScore(value);
  const interpretationStyle = interpretationClass(interpretationForMetric(row, field));
  return (
    <span className={`${warning ? 'history-warning' : ''} ${interpretationStyle}`.trim()}>
      {warning ? '⚠️ ' : ''}{formattedValue}
      {warning && <small title="Implausible value. Please verify data entry.">Verify entry</small>}
    </span>
  );
}

function MonitoringHistoryTable({ resultsRows, reportFields, displayVisibleFields, formatCellValue, communitySelection, beneficiaryType, showSchoolFilter, showGroupFilter, schoolOptions = [], onSchoolChange, loadingReport = false, growthMetricOptions, selectedGrowthMetric, onGrowthMetricChange, onRegisterExport, includeInterpretationColumns, setIncludeInterpretationColumns, onExport, exportingReport, selectedBatch, onSelectedBatchChange }) {
  const [viewMode, setViewMode] = useState('individual');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const visibleHistoryFields = reportFields.filter(([id]) => displayVisibleFields.includes(id) && historyFieldIds.has(id));
  const identityField = beneficiaryType === 'mother' ? 'mother' : 'child';
  const identityFields = reportFields.filter(([id]) => id === identityField);
  const communityFields = communityFieldsForSelection(communitySelection);
  const profileFields = reportFields.filter(([id]) => (
    displayVisibleFields.includes(id)
    && !historyFieldIds.has(id)
    && !['school', 'group', 'batch', 'mother', 'child'].includes(id)
  ));
  const months = useMemo(() => [...new Set(resultsRows.map((row) => String(row.measurementDate || '').slice(0, 7)).filter(Boolean))].sort(), [resultsRows]);
  const schools = useMemo(() => [...new Set(resultsRows.map((row) => row.school).filter(Boolean))].sort(), [resultsRows]);
  const groups = useMemo(() => [...new Set(resultsRows.map((row) => row.group).filter(Boolean))].sort(), [resultsRows]);
  const communityBatchKey = resultsRows.find((row) => String(row.batchId) === String(communitySelection?.batchId));
  const communitySchool = resultsRows.find((row) => String(row.schoolId) === String(communitySelection?.schoolId))?.school || '';
  const communityGroup = resultsRows.find((row) => String(row.groupId) === String(communitySelection?.groupId))?.group || '';
  const selectedSchoolOption = schoolOptions.find(({ id }) => String(id) === String(communitySelection?.schoolId));
  const activeSchoolId = communitySelection?.schoolId
    ? String(communitySelection.schoolId)
    : schoolOptions.length ? selectedSchool : '';
  const activeSchool = communitySchool || selectedSchoolOption?.name || (schoolOptions.length ? '' : selectedSchool);
  const activeGroup = communityGroup || (groups.includes(selectedGroup) ? selectedGroup : '');
  const scopedRows = resultsRows
    .filter((row) => !activeSchoolId || (row.schoolId !== undefined && row.schoolId !== null
      ? String(row.schoolId) === activeSchoolId
      : row.school === activeSchool))
    .filter((row) => !activeGroup || row.group === activeGroup);
  const batches = [...new Map(scopedRows
    .filter((row) => row.batch)
    .map((row) => [String(row.batchId || row.batch), { id: String(row.batchId || row.batch), name: row.batch }])).values()];
  const activeBatch = communityBatchKey
    ? String(communityBatchKey.batchId || communityBatchKey.batch)
    : (batches.some(({ id }) => id === selectedBatch) ? selectedBatch : '');
  const beneficiaries = [...new Map(scopedRows.map((row) => [
    String(row.childId || row.motherId || row.child || row.mother || ''),
    row,
  ])).values()];
  const beneficiaryKey = (row) => String(row.childId || row.motherId || row.child || row.mother || '');
  const activeBeneficiary = beneficiaries.some((row) => beneficiaryKey(row) === selectedBeneficiary)
    ? selectedBeneficiary
    : beneficiaryKey(beneficiaries[0] || {});
  const activeMonth = months.includes(selectedMonth) ? selectedMonth : months.at(-1) || '';
  const filteredRows = scopedRows
    .filter((row) => viewMode !== 'monthly' || !activeBatch || String(row.batchId || row.batch || '') === activeBatch)
    .filter((row) => viewMode !== 'individual' || String(row.childId || row.motherId || row.child || row.mother) === activeBeneficiary)
    .filter((row) => viewMode !== 'monthly' || !activeMonth || String(row.measurementDate).startsWith(activeMonth))
    .sort((left, right) => String(left.measurementDate || '').localeCompare(String(right.measurementDate || '')));
  const selectedProfile = filteredRows[0] || {};
  const historyMetricFields = visibleHistoryFields.filter(([id]) => id !== 'measurementDate');
  const individualHistoryFields = [['measurementDate', 'Check-up Date'], ...profileFields, ...historyMetricFields];
  const monthlyHistoryFields = [...communityFields, ...identityFields, ...profileFields, ...historyMetricFields];
  const averageFields = historyMetricFields.map(([id]) => id);
  const averageLabelField = (viewMode === 'individual' ? individualHistoryFields : monthlyHistoryFields)[0]?.[0];
  const averageRow = buildMonitoringAverageRow(filteredRows, averageFields, averageLabelField);
  const exportFilteredRows = () => onExport({
    rows: filteredRows,
    fields: viewMode === 'individual'
      ? individualHistoryFields
      : monthlyHistoryFields,
    averageFields,
    averageLabelField,
    view: 'table',
    tableMode: 'monitoring-dates',
    historyView: viewMode,
    selectedBeneficiary: activeBeneficiary,
    selectedMonth: activeMonth,
    selectedSchool: activeSchool,
    selectedGroup: activeGroup,
    selectedBatch: activeBatch,
  });
  onRegisterExport?.(exportFilteredRows);

  return (
    <div className="monitoring-history-view">
      <div className="monitoring-history-tabs" role="tablist" aria-label="Monitoring table view">
        <button type="button" className={viewMode === 'individual' ? 'active' : ''} onClick={() => setViewMode('individual')}>👤 Individual History</button>
        <button type="button" className={viewMode === 'monthly' ? 'active' : ''} onClick={() => setViewMode('monthly')}>📅 Monthly Snapshot</button>
      </div>
      <div className="monitoring-history-filters">
        {beneficiaryType === 'mother' && (
          <label className="results-table-interpretation-filter">
            <input type="checkbox" checked={includeInterpretationColumns} onChange={(event) => setIncludeInterpretationColumns(event.target.checked)} />
            Include interpretation columns
          </label>
        )}
        {viewMode === 'individual' ? (
          <label>Search Beneficiary
            <select value={activeBeneficiary} onChange={(event) => setSelectedBeneficiary(event.target.value)}>
              {beneficiaries.length
                ? beneficiaries.map((row) => { const key = beneficiaryKey(row); return <option key={key} value={key}>{row.child || row.mother}</option>; })
                : <option value="">No beneficiaries in this group</option>}
            </select>
          </label>
        ) : (
          <label>Month
            <select value={selectedMonth || months.at(-1) || ''} onChange={(event) => setSelectedMonth(event.target.value)}>
              {months.map((month) => <option key={month} value={month}>{new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</option>)}
            </select>
          </label>
        )}
        {showSchoolFilter && (
          <label>School
            <select
              aria-label="Report school"
              value={communitySelection?.schoolId ? String(communitySelection.schoolId) : selectedSchool}
              onChange={(event) => {
                setSelectedSchool('');
                setSelectedGroup('');
                if (onSchoolChange) onSchoolChange(event.target.value);
                else setSelectedSchool(event.target.value);
              }}
              disabled={loadingReport}
            >
              <option value="">All Schools</option>
              {schoolOptions.length
                ? schoolOptions.map(({ id, name }) => <option key={id} value={String(id)}>{name}</option>)
                : schools.map((school) => <option key={school} value={school}>{school}</option>)}
            </select>
          </label>
        )}
        {showGroupFilter && (
          <label>Group
            <select value={activeGroup} onChange={(event) => setSelectedGroup(event.target.value)} disabled={Boolean(communityGroup)}><option value="">All Groups</option>{groups.map((group) => <option key={group} value={group}>{group}</option>)}</select>
          </label>
        )}
        {viewMode === 'monthly' && batches.length > 0 && (
          <label>Batch
            <select value={activeBatch} onChange={(event) => onSelectedBatchChange(event.target.value)} disabled={Boolean(communityBatchKey)}>
              <option value="">All Batches</option>
              {batches.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
        )}
        {growthMetricOptions?.length > 0 && (
          <label>Growth metric
            <select value={selectedGrowthMetric} onChange={(event) => onGrowthMetricChange?.(event.target.value)}>
              {growthMetricOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
        )}
      </div>
      {viewMode === 'individual' ? (
        <>
          <div className="monitoring-history-profile">
            <strong>{beneficiaryType === 'mother' ? 'Mother' : 'Child'}: {selectedProfile[identityField] || '—'}</strong>
            {beneficiaryType === 'child' && <span>Mother: {selectedProfile.mother || '—'}</span>}
            <span>School: {selectedProfile.school || '—'}</span>
            <span>Group: {selectedProfile.group || '—'}</span>
            {profileFields.map(([id, label]) => (
              <span key={id}>{label}: {formatCellValue(id, selectedProfile[id]) || '—'}</span>
            ))}
          </div>
          <div className="progress-report-table-shell">
            <table className="progress-report-table monitoring-history-table">
              <thead><tr><th>Check-up Date</th>{profileFields.map(([id, label]) => <th key={id}>{label}</th>)}{historyMetricFields.map(([id, label]) => <th key={id}>{label}</th>)}</tr></thead>
              <tbody>{filteredRows.length ? <>{filteredRows.map((row, index) => <tr key={row.historyRowKey || index}><td>{formatCellValue('measurementDate', row.measurementDate)}</td>{profileFields.map(([id]) => <td key={id}>{formatCellValue(id, row[id]) || '—'}</td>)}{historyMetricFields.map(([id]) => <td key={id}><HistoryCell field={id} value={row[id]} formatCellValue={formatCellValue} row={row} /></td>)}</tr>)}{averageRow && <tr className="monitoring-average-row"><td>Average</td>{profileFields.map(([id]) => <td key={id} />)}{historyMetricFields.map(([id]) => <td key={id}>{formatCellValue(id, averageRow[id])}</td>)}</tr>}</> : <tr><td colSpan={Math.max(1, profileFields.length + historyMetricFields.length + 1)} className="growth-report-empty">No check-up history for this beneficiary in the selected group.</td></tr>}</tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="progress-report-table-shell">
          <table className="progress-report-table monitoring-snapshot-table">
            <thead><tr>{communityFields.map(([id, label]) => <th key={id}>{label}</th>)}{identityFields.map(([id, label]) => <th key={id}>{label}</th>)}{profileFields.map(([id, label]) => <th key={id}>{label}</th>)}{historyMetricFields.map(([id, label]) => <th key={id}>{label}</th>)}</tr></thead>
            <tbody>{filteredRows.map((row, index) => <tr key={row.historyRowKey || index}>{communityFields.map(([id]) => <td key={id}>{formatCellValue(id, row[id]) || '—'}</td>)}{identityFields.map(([id]) => <td key={id}>{formatCellValue(id, row[id])}</td>)}{profileFields.map(([id]) => <td key={id}>{formatCellValue(id, row[id]) || '—'}</td>)}{historyMetricFields.map(([id]) => <td key={id}><HistoryCell field={id} value={row[id]} formatCellValue={formatCellValue} row={row} /></td>)}</tr>)}{averageRow && <tr className="monitoring-average-row">{monthlyHistoryFields.map(([id]) => <td key={id}>{id === averageLabelField ? 'Average' : averageRow[id] !== undefined ? formatCellValue(id, averageRow[id]) : ''}</td>)}</tr>}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StandardResultsTable({ resultsRows, fields, formatCellValue, beneficiaryType, blankEmptyValues = false, emptyMessage = 'No results found.' }) {
  const safeFields = Array.isArray(fields) && fields.length ? fields : [];
  const preferredIdentity = beneficiaryType === 'mother' ? 'mother' : 'child';
  const identityField = safeFields.some(([id]) => id === preferredIdentity)
    ? preferredIdentity
    : safeFields.some(([id]) => id === 'child') ? 'child' : safeFields.some(([id]) => id === 'mother') ? 'mother' : '';
  const fieldSignature = safeFields.map(([id]) => id).join('|');
  const identityOffsetRef = useRef(null);
  const [stickyIdentityVisible, setStickyIdentityVisible] = useState(false);

  useEffect(() => {
    identityOffsetRef.current = null;
    setStickyIdentityVisible(false);
  }, [fieldSignature, identityField]);

  const handleTableScroll = (event) => {
    if (!identityField) return;
    const shell = event.currentTarget;
    const table = shell.querySelector('.standard-results-table');
    const identityHeader = table?.querySelector(`th[data-field="${identityField}"]`);
    if (!table || !identityHeader) return;
    if (identityOffsetRef.current === null) {
      identityOffsetRef.current = identityHeader.getBoundingClientRect().left - table.getBoundingClientRect().left;
    }
    setStickyIdentityVisible(shell.scrollLeft > identityOffsetRef.current);
  };

  return (
    <div className={`progress-report-table-shell${stickyIdentityVisible ? ' has-sticky-identity' : ''}`} onScroll={handleTableScroll}>
      <table className="progress-report-table standard-results-table">
        <thead>
          <tr>{safeFields.map(([id, label]) => <th key={id} data-field={id} className={id === identityField ? 'standard-results-table__identity' : undefined}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {resultsRows.length ? (
            resultsRows.map((row, index) => <tr key={row.historyRowKey || index}>{safeFields.map(([id]) => {
              const value = row[id];
              const className = interpretationClass(interpretationForMetric(row, id));
              const formattedValue = formatCellValue(id, value);
              const displayValue = blankEmptyValues ? formatProfileReportCellValue(formattedValue) : formattedValue;
              return <td key={id} className={id === identityField ? 'standard-results-table__identity' : undefined}><span className={className}>{displayValue}</span></td>;
            })}</tr>)
          ) : (
            <tr>
              <td colSpan={Math.max(safeFields.length, 1)} className="growth-report-empty">{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function getLatestResultsTableData(
  resultsRows,
  beneficiaryType,
  resultPeriod,
  communitySelection,
  includeInterpretationColumns = true,
) {
  const beneficiaryField = beneficiaryType === 'mother' ? 'mother' : 'child';
  const beneficiaryLabel = beneficiaryType === 'mother' ? 'Mother Name' : 'Child Name';
  const communityFields = communityFieldsForSelection(communitySelection);
  const rowsWithBmi = resultsRows.map((row) => {
    const visitDate = String(row.measurementDate || '').slice(0, 10);
    const visit = row.growthSeries?.find((point) => String(point.date || point.measurementDate || '').slice(0, 10) === visitDate);
    const rawBmi = visit ? visit.bmi : row.bmiForAge;
    const hasBmi = rawBmi !== null && rawBmi !== undefined && rawBmi !== '' && Number.isFinite(Number(rawBmi));
    const bmi = hasBmi ? Number(rawBmi) : '';
    return {
      ...row,
      bmiForAge: bmi,
      bmiInterpretation: beneficiaryType === 'mother' && hasBmi ? getBmiInterpretation(bmi) : '',
    };
  });

  if (resultPeriod === 'latest') {
    const latestFields = filterInterpretationFields([
      ...communityFields,
      [beneficiaryField, beneficiaryLabel],
      ['measurementDate', 'Latest Report Date'],
      ['bmiForAge', 'BMI'],
      ['bmiInterpretation', 'BMI Interpretation'],
    ], includeInterpretationColumns);
    return { rows: rowsWithBmi, fields: latestFields };
  }

  const monthColumns = [...new Set(rowsWithBmi
    .map((row) => String(row.measurementDate || '').slice(0, 7))
    .filter(Boolean))].sort((left, right) => right.localeCompare(left));
  const fields = filterInterpretationFields([
    ...communityFields,
    ['beneficiaryName', beneficiaryLabel],
    ...monthColumns.map((month) => {
      const date = new Date(`${month}-01T00:00:00`);
      const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
      const yearLabel = new Intl.DateTimeFormat('en-US', { year: '2-digit' }).format(date);
      return [month, `${monthLabel}-${yearLabel}`];
    }).flatMap(([month, label]) => beneficiaryType === 'mother'
      ? [[month, label], [`${month}Interpretation`, `${label} Interpretation`]]
      : [[month, label]]),
  ], includeInterpretationColumns);
  const rowsByBeneficiary = new Map();
  rowsWithBmi.forEach((row) => {
    const visitDate = String(row.measurementDate || '').slice(0, 10);
    const beneficiaryKey = String(row.childId || row.motherId || row[beneficiaryField] || row.beneficiaryName || '');
    const beneficiaryRow = rowsByBeneficiary.get(beneficiaryKey) || {
      beneficiaryName: row[beneficiaryField] || 'Unnamed beneficiary',
      historyRowKey: beneficiaryKey,
      [beneficiaryField]: row[beneficiaryField] || '',
      mother: row.mother || '',
      age: row.age ?? '',
      gender: row.gender || '',
      dateOfBirth: row.dateOfBirth || '',
      group: row.group || '',
      batch: row.batch || '',
      communityDate: visitDate,
    };
    if (visitDate > beneficiaryRow.communityDate) {
      communityFields.forEach(([id]) => { beneficiaryRow[id] = row[id] || ''; });
      beneficiaryRow.communityDate = visitDate;
    }
    const visitMonth = visitDate.slice(0, 7);
    if (visitMonth && row.bmiForAge !== '') {
      const currentMonthBmi = beneficiaryRow[visitMonth];
      if (!currentMonthBmi || visitDate > currentMonthBmi.date) {
        beneficiaryRow[visitMonth] = {
          date: visitDate,
          bmi: row.bmiForAge,
          interpretation: row.bmiInterpretation,
        };
      }
    }
    rowsByBeneficiary.set(beneficiaryKey, beneficiaryRow);
  });
  const matrixRows = [...rowsByBeneficiary.values()].map(({ communityDate, ...row }) => ({
    ...row,
    ...Object.fromEntries(monthColumns.flatMap((month) => [
      [month, row[month]?.bmi ?? ''],
      ...(beneficiaryType === 'mother' ? [[`${month}Interpretation`, row[month]?.interpretation ?? '']] : []),
    ])),
  }));

  return { rows: matrixRows, fields, hasUndatedRows: monthColumns.length === 0 && rowsByBeneficiary.size > 0 };
}

function LatestResultsTable({
  resultsRows,
  formatCellValue,
  beneficiaryType,
  resultPeriod,
  communitySelection,
  includeInterpretationColumns,
}) {
  const tableData = getLatestResultsTableData(
    resultsRows,
    beneficiaryType,
    resultPeriod,
    communitySelection,
    includeInterpretationColumns,
  );
  return (
    <>
      <StandardResultsTable resultsRows={tableData.rows} fields={tableData.fields} formatCellValue={formatCellValue} emptyMessage="No results found for this period." />
      {tableData.hasUndatedRows && <p className="growth-report-empty" role="status">No dated BMI readings are available for the selected period.</p>}
    </>
  );
}

export function ResultsTable({
  resultsRows,
  reportFields,
  displayVisibleFields,
  showMonitoringFilter,
  showSchoolFilter = true,
  showGroupFilter = true,
  growthMetricOptions = [],
  selectedGrowthMetric = '',
  onGrowthMetricChange,
  onRegisterMonitoringExport,
  communitySelection,
  beneficiaryType,
  showProfileFilter,
  includeInterpretationColumns,
  setIncludeInterpretationColumns,
  exportingReport = false,
  profileFieldSections = {},
  profileSectionLabels = {},
  profileSection = 'general',
  setProfileSection,
  onExport,
  displaySort,
  sortLabel,
  formatCellValue,
  selectedBatch = '',
  onSelectedBatchChange,
  schoolOptions = [],
  onSchoolChange,
  loadingReport = false,
}) {
  const visibleFields = reportFields.filter(([id]) => displayVisibleFields.includes(id));
  const [hiddenFields, setHiddenFields] = useState(() => new Set());
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [selectedProfileGroup, setSelectedProfileGroup] = useState('');
  const [selectedProfileBatch, setSelectedProfileBatch] = useState('');
  const customizerTriggerRef = useRef(null);
  const profileGroupOptions = showProfileFilter ? getProfileReportScopeOptions(resultsRows, 'group') : [];
  const activeProfileGroup = profileGroupOptions.some(({ id }) => id === selectedProfileGroup) ? selectedProfileGroup : '';
  const groupScopedRows = showProfileFilter ? filterProfileReportRows(resultsRows, activeProfileGroup) : resultsRows;
  const profileBatchOptions = showProfileFilter ? getProfileReportScopeOptions(groupScopedRows, 'batch') : [];
  const activeProfileBatch = profileBatchOptions.some(({ id }) => id === selectedProfileBatch) ? selectedProfileBatch : '';
  const filteredProfileRows = showProfileFilter
    ? filterProfileReportRows(resultsRows, activeProfileGroup, activeProfileBatch)
    : resultsRows;
  const sectionFields = visibleFields.filter(([id]) => {
    if (showProfileFilter && profileFieldSections[id] && profileFieldSections[id] !== profileSection) {
      return false;
    }
    return true;
  });
  const customizedFields = sectionFields.filter(([id]) => !hiddenFields.has(id));
  const showCustomize = !showMonitoringFilter;
  const currentTableData = { rows: filteredProfileRows, fields: customizedFields };
  return (
    <div className="results-table-wrap">
      {(showCustomize || showProfileFilter) && (
        <div className="results-table-tools">
          <div className="results-table-filters" role="group" aria-label="Report filters">
            {showProfileFilter && (
              <label className="results-table-period-filter">Profile section
                <select value={profileSection} onChange={(event) => setProfileSection(event.target.value)}>
                  {Object.entries(profileSectionLabels).filter(([value]) => value !== 'all').map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            )}
            {showProfileFilter && profileGroupOptions.length > 1 && (
              <label className="results-table-period-filter">Group
                <select
                  aria-label="Profile report group"
                  value={activeProfileGroup}
                  onChange={(event) => {
                    setSelectedProfileGroup(event.target.value);
                    setSelectedProfileBatch('');
                  }}
                >
                  <option value="">All groups</option>
                  {profileGroupOptions.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
            )}
            {showProfileFilter && profileBatchOptions.length > 1 && (
              <label className="results-table-period-filter">Batch
                <select
                  aria-label="Profile report batch"
                  value={activeProfileBatch}
                  onChange={(event) => setSelectedProfileBatch(event.target.value)}
                >
                  <option value="">All batches</option>
                  {profileBatchOptions.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
            )}
          </div>
          <div className="results-table-actions">
            {showCustomize && (
              <details
                className="results-table-customizer"
                open={customizerOpen}
              >
                <summary
                  ref={customizerTriggerRef}
                  aria-haspopup="menu"
                  aria-expanded={customizerOpen}
                  onClick={(event) => {
                    event.preventDefault();
                    setCustomizerOpen((open) => !open);
                  }}
                >
                  Customize table
                </summary>
                <FloatingLayer
                  open={customizerOpen}
                  anchorRef={customizerTriggerRef}
                  onDismiss={() => setCustomizerOpen(false)}
                  className="results-table-customizer-menu"
                  role="menu"
                  aria-label="Visible columns"
                >
                  <div className="results-table-customizer-heading">
                    <strong>Visible columns</strong>
                    <button type="button" onClick={() => setHiddenFields(new Set())}>Reset</button>
                  </div>
                  {sectionFields.map(([id, label]) => (
                    <label key={id}>
                      <input type="checkbox" checked={!hiddenFields.has(id)} onChange={() => setHiddenFields((current) => {
                        const next = new Set(current);
                        if (next.has(id)) next.delete(id); else next.add(id);
                        return next;
                      })} />
                      {label}
                    </label>
                  ))}
                </FloatingLayer>
              </details>
            )}
            {!showMonitoringFilter && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => onExport({ ...currentTableData, view: 'table' })}
                disabled={exportingReport}
              >
                {exportingReport ? 'Preparing CSV…' : 'Export CSV'}
              </button>
            )}
          </div>
        </div>
      )}
      {showMonitoringFilter ? (
        <MonitoringHistoryTable resultsRows={resultsRows} reportFields={reportFields} displayVisibleFields={displayVisibleFields} formatCellValue={formatCellValue} communitySelection={communitySelection} beneficiaryType={beneficiaryType} showSchoolFilter={showSchoolFilter} showGroupFilter={showGroupFilter} schoolOptions={schoolOptions} onSchoolChange={onSchoolChange} loadingReport={loadingReport} growthMetricOptions={growthMetricOptions} selectedGrowthMetric={selectedGrowthMetric} onGrowthMetricChange={onGrowthMetricChange} onRegisterExport={onRegisterMonitoringExport} includeInterpretationColumns={includeInterpretationColumns} setIncludeInterpretationColumns={setIncludeInterpretationColumns} onExport={onExport} exportingReport={exportingReport} selectedBatch={selectedBatch} onSelectedBatchChange={onSelectedBatchChange} />
      ) : (
      <StandardResultsTable resultsRows={filteredProfileRows} fields={customizedFields} formatCellValue={formatCellValue} beneficiaryType={beneficiaryType} blankEmptyValues={showProfileFilter} />
      )}
    </div>
  );
}
