import React, { useMemo, useState } from 'react';
import { getBmiInterpretation } from '../progressReportConfig';

const historyFieldIds = new Set(['measurementDate', 'weightForAge', 'heightForAge', 'bmiForAge', 'weightForLengthZScore', 'weightForLengthInterpretation', 'weightForAgeZScore', 'weightForAgeInterpretation', 'lengthForAgeZScore', 'lengthForAgeInterpretation', 'bmiInterpretation']);

const isZScoreField = (field) => /ZScore$/i.test(field);
const isImplausibleZScore = (value) => {
  const score = Number(value);
  return Number.isFinite(score) && (score < -5 || score > 5);
};

const interpretationClass = (value) => {
  const normalized = String(value || '').toLowerCase();
  if (!normalized) return '';
  if (normalized.includes('normal')) return 'interpretation-normal';
  if (normalized.includes('severe') || normalized.includes('obese')) return 'interpretation-severe';
  if (normalized.includes('underweight') || normalized.includes('stunted') || normalized.includes('wasted') || normalized.includes('overweight') || normalized.includes('tall')) return 'interpretation-moderate';
  return '';
};

function HistoryCell({ field, value, formatCellValue }) {
  const formattedValue = formatCellValue(field, value);
  const warning = isZScoreField(field) && isImplausibleZScore(value);
  return (
    <span className={`${warning ? 'history-warning' : ''} ${field.endsWith('Interpretation') ? interpretationClass(value) : ''}`.trim()}>
      {warning ? '⚠️ ' : ''}{formattedValue}
      {warning && <small title="Implausible value. Please verify data entry.">Verify entry</small>}
    </span>
  );
}

function MonitoringHistoryTable({ resultsRows, reportFields, displayVisibleFields, formatCellValue, communitySelection }) {
  const [viewMode, setViewMode] = useState('individual');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const visibleHistoryFields = reportFields.filter(([id]) => displayVisibleFields.includes(id) && historyFieldIds.has(id));
  const identityFields = reportFields.filter(([id]) => ['mother', 'child'].includes(id));
  const beneficiaries = useMemo(() => [...new Map(resultsRows.map((row) => [String(row.childId || row.motherId || row.child || row.mother), row])).values()], [resultsRows]);
  const months = useMemo(() => [...new Set(resultsRows.map((row) => String(row.measurementDate || '').slice(0, 7)).filter(Boolean))].sort(), [resultsRows]);
  const schools = useMemo(() => [...new Set(resultsRows.map((row) => row.school).filter(Boolean))].sort(), [resultsRows]);
  const groups = useMemo(() => [...new Set(resultsRows.map((row) => row.group).filter(Boolean))].sort(), [resultsRows]);
  const communitySchool = resultsRows.find((row) => String(row.schoolId) === String(communitySelection?.schoolId))?.school || '';
  const communityGroup = resultsRows.find((row) => String(row.groupId) === String(communitySelection?.groupId))?.group || '';
  const activeSchool = communitySchool || selectedSchool;
  const activeGroup = communityGroup || selectedGroup;
  const activeBeneficiary = selectedBeneficiary || String(beneficiaries[0]?.childId || beneficiaries[0]?.motherId || beneficiaries[0]?.child || beneficiaries[0]?.mother || '');
  const activeMonth = selectedMonth || months.at(-1) || '';
  const filteredRows = resultsRows
    .filter((row) => !activeSchool || row.school === activeSchool)
    .filter((row) => !activeGroup || row.group === activeGroup)
    .filter((row) => viewMode !== 'individual' || String(row.childId || row.motherId || row.child || row.mother) === activeBeneficiary)
    .filter((row) => viewMode !== 'monthly' || !activeMonth || String(row.measurementDate).startsWith(activeMonth))
    .sort((left, right) => String(left.measurementDate || '').localeCompare(String(right.measurementDate || '')));
  const selectedProfile = filteredRows[0] || beneficiaries.find((row) => String(row.childId || row.motherId || row.child || row.mother) === activeBeneficiary) || {};
  const historyMetricFields = visibleHistoryFields.filter(([id]) => id !== 'measurementDate');

  return (
    <div className="monitoring-history-view">
      <div className="monitoring-history-tabs" role="tablist" aria-label="Monitoring table view">
        <button type="button" className={viewMode === 'individual' ? 'active' : ''} onClick={() => setViewMode('individual')}>👤 Individual History</button>
        <button type="button" className={viewMode === 'monthly' ? 'active' : ''} onClick={() => setViewMode('monthly')}>📅 Monthly Snapshot</button>
      </div>
      <div className="monitoring-history-filters">
        {viewMode === 'individual' ? (
          <label>Search Beneficiary
            <select value={activeBeneficiary} onChange={(event) => setSelectedBeneficiary(event.target.value)}>
              {beneficiaries.map((row) => { const key = String(row.childId || row.motherId || row.child || row.mother); return <option key={key} value={key}>{row.child || row.mother}</option>; })}
            </select>
          </label>
        ) : (
          <label>Month
            <select value={selectedMonth || months.at(-1) || ''} onChange={(event) => setSelectedMonth(event.target.value)}>
              {months.map((month) => <option key={month} value={month}>{new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</option>)}
            </select>
          </label>
        )}
        <label>School
          <select value={activeSchool} onChange={(event) => setSelectedSchool(event.target.value)} disabled={Boolean(communitySchool)}><option value="">All Schools</option>{schools.map((school) => <option key={school} value={school}>{school}</option>)}</select>
        </label>
        <label>Group
          <select value={activeGroup} onChange={(event) => setSelectedGroup(event.target.value)} disabled={Boolean(communityGroup)}><option value="">All Groups</option>{groups.map((group) => <option key={group} value={group}>{group}</option>)}</select>
        </label>
      </div>
      {viewMode === 'individual' ? (
        <>
          <div className="monitoring-history-profile">
            <strong>Child: {selectedProfile.child || '—'}</strong>
            <span>Mother: {selectedProfile.mother || '—'}</span>
            <span>School: {selectedProfile.school || '—'}</span>
            <span>Group: {selectedProfile.group || '—'}</span>
          </div>
          <div className="progress-report-table-shell">
            <table className="progress-report-table monitoring-history-table">
              <thead><tr><th>Measurement Date</th>{historyMetricFields.map(([id, label]) => <th key={id}>{label}</th>)}</tr></thead>
              <tbody>{filteredRows.map((row, index) => <tr key={row.historyRowKey || index}><td>{formatCellValue('measurementDate', row.measurementDate)}</td>{historyMetricFields.map(([id]) => <td key={id}><HistoryCell field={id} value={row[id]} formatCellValue={formatCellValue} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="progress-report-table-shell">
          <table className="progress-report-table monitoring-snapshot-table">
            <thead><tr>{identityFields.map(([id, label]) => <th key={id}>{label}</th>)}{historyMetricFields.map(([id, label]) => <th key={id}>{label}</th>)}</tr></thead>
            <tbody>{filteredRows.map((row, index) => <tr key={row.historyRowKey || index}>{identityFields.map(([id]) => <td key={id}>{formatCellValue(id, row[id])}</td>)}{historyMetricFields.map(([id]) => <td key={id}><HistoryCell field={id} value={row[id]} formatCellValue={formatCellValue} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StandardResultsTable({ resultsRows, fields, formatCellValue, emptyMessage = 'No results found.' }) {
  const safeFields = Array.isArray(fields) && fields.length ? fields : [];

  return (
    <div className="progress-report-table-shell">
      <table className="progress-report-table standard-results-table">
        <thead>
          <tr>{safeFields.map(([id, label]) => <th key={id}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {resultsRows.length ? (
            resultsRows.map((row, index) => <tr key={row.historyRowKey || index}>{safeFields.map(([id]) => <td key={id}>{formatCellValue(id, row[id])}</td>)}</tr>)
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

function LatestResultsTable({ resultsRows, formatCellValue, beneficiaryType, resultPeriod }) {
  const beneficiaryField = beneficiaryType === 'mother' ? 'mother' : 'child';
  const beneficiaryLabel = beneficiaryType === 'mother' ? 'Mother Name' : 'Child Name';
  const rowsWithBmi = resultsRows.map((row) => {
    const visitDate = String(row.measurementDate || '').slice(0, 10);
    const visit = row.growthSeries?.find((point) => String(point.date || point.measurementDate || '').slice(0, 10) === visitDate);
    const rawBmi = visit ? visit.bmi : row.bmiForAge;
    const hasBmi = rawBmi !== null && rawBmi !== undefined && rawBmi !== '' && Number.isFinite(Number(rawBmi));
    const bmi = hasBmi ? Number(rawBmi) : '';
    return {
      ...row,
      bmiForAge: bmi,
      bmiInterpretation: hasBmi ? getBmiInterpretation(bmi) : '',
    };
  });

  if (resultPeriod === 'latest') {
    const latestFields = [
      [beneficiaryField, beneficiaryLabel],
      ['measurementDate', 'Latest Report Date'],
      ['bmiForAge', 'BMI'],
      ['bmiInterpretation', 'BMI Interpretation'],
    ];
    return <StandardResultsTable resultsRows={rowsWithBmi} fields={latestFields} formatCellValue={formatCellValue} emptyMessage="No results found for this period." />;
  }

  const monthColumns = [...new Set(rowsWithBmi
    .map((row) => String(row.measurementDate || '').slice(0, 7))
    .filter(Boolean))].sort((left, right) => right.localeCompare(left));
  const fields = [
    ['beneficiaryName', beneficiaryLabel],
    ...monthColumns.map((month) => [month, new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(`${month}-01T00:00:00`))]),
  ];
  const rowsByBeneficiary = new Map();
  rowsWithBmi.forEach((row) => {
    const visitDate = String(row.measurementDate || '').slice(0, 10);
    const beneficiaryKey = String(row.childId || row.motherId || row[beneficiaryField] || row.beneficiaryName || '');
    const beneficiaryRow = rowsByBeneficiary.get(beneficiaryKey) || {
      beneficiaryName: row[beneficiaryField] || 'Unnamed beneficiary',
      historyRowKey: beneficiaryKey,
    };
    const visitMonth = visitDate.slice(0, 7);
    if (visitMonth && row.bmiForAge !== '') {
      const currentMonthBmi = beneficiaryRow[visitMonth];
      if (!currentMonthBmi || visitDate > currentMonthBmi.date) {
        beneficiaryRow[visitMonth] = { date: visitDate, bmi: row.bmiForAge };
      }
    }
    rowsByBeneficiary.set(beneficiaryKey, beneficiaryRow);
  });
  const matrixRows = [...rowsByBeneficiary.values()].map((row) => ({
    ...row,
    ...Object.fromEntries(monthColumns.map((month) => [month, row[month]?.bmi ?? ''])),
  }));

  return (
    <>
      <StandardResultsTable resultsRows={matrixRows} fields={fields} formatCellValue={formatCellValue} emptyMessage="No results found for this period." />
      {monthColumns.length === 0 && rowsByBeneficiary.size > 0 && <p className="growth-report-empty" role="status">No dated BMI readings are available for the selected period.</p>}
    </>
  );
}

export function ResultsTable({
  resultsRows,
  reportFields,
  displayVisibleFields,
  tableDisplayMode,
  setTableDisplayMode,
  showMonitoringFilter,
  communitySelection,
  beneficiaryType,
  monitoringRows,
  showProfileFilter,
  profileFieldSections = {},
  profileSectionLabels = {},
  profileSection = 'general',
  setProfileSection,
  displaySort,
  sortLabel,
  formatCellValue,
}) {
  const visibleFields = reportFields.filter(([id]) => displayVisibleFields.includes(id));
  const [hiddenFields, setHiddenFields] = useState(() => new Set());
  const hasColumnValues = (fieldId) => (resultsRows || []).some((row) => {
    const value = row[fieldId];
    return value !== undefined && value !== null && String(value).trim() !== '';
  });
  const sectionFields = visibleFields.filter(([id]) => {
    if (showProfileFilter && profileFieldSections[id] && profileFieldSections[id] !== profileSection) {
      return false;
    }
    if ((resultsRows || []).length === 0) return true;
    return hasColumnValues(id);
  });
  const customizedFields = sectionFields.filter(([id]) => !hiddenFields.has(id));
  const showCustomize = !showMonitoringFilter;
  const showResultPeriod = showMonitoringFilter && tableDisplayMode === 'general';
  const [resultPeriod, setResultPeriod] = useState('all');
  const today = new Date();
  const validMonitoringRows = (monitoringRows || []).filter((row) => {
    const date = new Date(row.measurementDate);
    return row.measurementDate && !Number.isNaN(date.getTime());
  });
  const resultPeriodOptions = [
    { value: 'all', label: 'All' },
    { value: 'latest', label: 'Latest' },
  ];
  const getBeneficiaryKey = (row) => String(row.childId || row.motherId || row.child || row.mother);
  const rowsByBeneficiary = (rows) => [...new Map([...rows]
    .sort((left, right) => String(right.measurementDate).localeCompare(String(left.measurementDate)))
    .map((row) => [getBeneficiaryKey(row), row])).values()];
  const datedBeneficiaries = new Set(validMonitoringRows.map(getBeneficiaryKey));
  const beneficiariesWithoutDatedMeasurements = rowsByBeneficiary(resultsRows)
    .filter((row) => !datedBeneficiaries.has(getBeneficiaryKey(row)));
  const latestDatedRows = rowsByBeneficiary(validMonitoringRows);
  const periodRows = resultPeriod === 'latest'
    ? [...latestDatedRows, ...beneficiariesWithoutDatedMeasurements]
    : [...validMonitoringRows, ...beneficiariesWithoutDatedMeasurements];
  return (
    <div className="results-table-wrap">
      {showMonitoringFilter && (
        <div className="results-table-subheader">
          <label htmlFor="table-display-mode">Table display</label>
          <select id="table-display-mode" value={tableDisplayMode} onChange={(event) => setTableDisplayMode(event.target.value)}>
            <option value="general">General table</option>
            <option value="monitoring-dates">Monitoring dates + growth value</option>
          </select>
        </div>
      )}
      {(showCustomize || showResultPeriod || showProfileFilter) && (
        <div className="results-table-tools">
          {showCustomize && (
            <details className="results-table-customizer">
              <summary>Customize table</summary>
              <div className="results-table-customizer-menu">
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
              </div>
            </details>
          )}
          {showResultPeriod && (
            <label className="results-table-period-filter">Result period
              <select value={resultPeriod} onChange={(event) => setResultPeriod(event.target.value)}>
                {resultPeriodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          )}
          {showProfileFilter && (
            <label className="results-table-period-filter">Profile section
                <select value={profileSection} onChange={(event) => setProfileSection(event.target.value)}>
                {Object.entries(profileSectionLabels).filter(([value]) => value !== 'all').map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          )}
        </div>
      )}
      {showMonitoringFilter && tableDisplayMode === 'monitoring-dates' ? (
        <MonitoringHistoryTable resultsRows={resultsRows} reportFields={reportFields} displayVisibleFields={displayVisibleFields} formatCellValue={formatCellValue} communitySelection={communitySelection} />
      ) : showMonitoringFilter && tableDisplayMode === 'general' ? (
        <LatestResultsTable resultsRows={periodRows} formatCellValue={formatCellValue} beneficiaryType={beneficiaryType} resultPeriod={resultPeriod} />
      ) : (
      <StandardResultsTable resultsRows={resultsRows} fields={customizedFields} formatCellValue={formatCellValue} />
      )}
    </div>
  );
}
