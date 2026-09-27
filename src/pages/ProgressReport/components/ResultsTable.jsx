import React, { useMemo, useState } from 'react';

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

function LatestResultsTable({ resultsRows, reportFields, displayVisibleFields, formatCellValue, beneficiaryType }) {
  const identityFields = beneficiaryType === 'mother' ? ['mother'] : ['child', 'mother'];
  const selectedFields = reportFields.filter(([id]) => displayVisibleFields.includes(id));
  const selectedFieldMap = new Map(selectedFields.map((field) => [field[0], field]));
  const latestFields = [
    ['measurementDate', 'Report Date'],
    ...identityFields.map((id) => selectedFieldMap.get(id)).filter(Boolean),
    ...selectedFields.filter(([id]) => id !== 'measurementDate' && !identityFields.includes(id)),
  ];

  if (!resultsRows.length) return <p className="growth-report-empty">No results found for this period.</p>;

  return (
    <div className="progress-report-table-shell">
      <table className="progress-report-table latest-results-table">
        <thead><tr>{latestFields.map(([id, label]) => <th key={id}>{label}</th>)}</tr></thead>
        <tbody>{resultsRows.map((row, index) => <tr key={row.historyRowKey || index}>{latestFields.map(([id]) => <td key={id}>{formatCellValue(id, row[id])}</td>)}</tr>)}</tbody>
      </table>
    </div>
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
  displaySort,
  sortLabel,
  formatCellValue,
}) {
  const visibleFields = reportFields.filter(([id]) => displayVisibleFields.includes(id));
  const [hiddenFields, setHiddenFields] = useState(() => new Set());
  const customizedFields = visibleFields.filter(([id]) => !hiddenFields.has(id));
  const showCustomize = !showMonitoringFilter || tableDisplayMode === 'general';
  const [resultPeriod, setResultPeriod] = useState('latest');
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const validMonitoringRows = (monitoringRows || []).filter((row) => {
    const date = new Date(row.measurementDate);
    return row.measurementDate && !Number.isNaN(date.getTime()) && date <= today;
  });
  const monitorDates = [...new Set(validMonitoringRows.map((row) => String(row.measurementDate || '').slice(0, 10)).filter(Boolean))].sort().reverse();
  const earliestMonth = monitorDates.at(-1)?.slice(0, 7) || currentMonth;
  const monthRange = [];
  const [startYear, startMonth] = earliestMonth.split('-').map(Number);
  const [endYear, endMonth] = currentMonth.split('-').map(Number);
  for (let year = startYear, month = startMonth; year < endYear || (year === endYear && month <= endMonth); month += 1) {
    monthRange.push(`${year}-${String(month).padStart(2, '0')}`);
    if (month === 12) { year += 1; month = 0; }
  }
  const monitorMonths = monthRange.reverse();
  const resultPeriodOptions = [
    { value: 'latest', label: `Latest (${monitorDates[0] ? formatCellValue('measurementDate', monitorDates[0]) : 'No date'})` },
    ...(monitorDates[1] ? [{ value: 'second-latest', label: `2nd latest (${formatCellValue('measurementDate', monitorDates[1])})` }] : []),
    ...monitorMonths.map((month) => ({ value: `month:${month}`, label: new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) })),
  ];
  const rowsByBeneficiary = (rows) => [...new Map(rows
    .sort((left, right) => String(right.measurementDate).localeCompare(String(left.measurementDate)))
    .map((row) => [String(row.childId || row.motherId || row.child || row.mother), row])).values()];
  const monitoringRowsByBeneficiary = validMonitoringRows
    .sort((left, right) => String(right.measurementDate).localeCompare(String(left.measurementDate)))
    .reduce((groups, row) => {
      const key = String(row.childId || row.motherId || row.child || row.mother);
      const entries = groups.get(key) || [];
      if (entries.length < 2) entries.push(row);
      groups.set(key, entries);
      return groups;
    }, new Map());
  const selectedDateIndex = resultPeriod === 'second-latest' ? 1 : 0;
  const periodRows = resultPeriod.startsWith('month:')
    ? rowsByBeneficiary(validMonitoringRows.filter((row) => String(row.measurementDate || '').startsWith(resultPeriod.slice(6))))
    : [...monitoringRowsByBeneficiary.values()].map((rows) => rows[selectedDateIndex]).filter(Boolean);
  const columnLabel = (row, index) => {
    const name = row.child || row.mother || row.group || row.batch || `Record ${index + 1}`;
    const date = row.measurementDate ? ` · ${formatCellValue('measurementDate', row.measurementDate)}` : '';
    return `${name}${date}`;
  };

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
      {showCustomize && (
        <div className="results-table-tools">
          <details className="results-table-customizer">
            <summary>Customize table</summary>
            <div className="results-table-customizer-menu">
              <div className="results-table-customizer-heading">
                <strong>Visible row labels</strong>
                <button type="button" onClick={() => setHiddenFields(new Set())}>Reset</button>
              </div>
              {visibleFields.map(([id, label]) => (
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
          {showMonitoringFilter && tableDisplayMode === 'general' && (
            <label className="results-table-period-filter">Result period
              <select value={resultPeriod} onChange={(event) => setResultPeriod(event.target.value)}>
                {resultPeriodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          )}
        </div>
      )}
      {showMonitoringFilter && tableDisplayMode === 'monitoring-dates' ? (
        <MonitoringHistoryTable resultsRows={resultsRows} reportFields={reportFields} displayVisibleFields={displayVisibleFields} formatCellValue={formatCellValue} communitySelection={communitySelection} />
      ) : showMonitoringFilter && tableDisplayMode === 'general' ? (
        <LatestResultsTable resultsRows={periodRows.length ? periodRows : resultsRows} reportFields={reportFields} displayVisibleFields={customizedFields.map(([id]) => id)} formatCellValue={formatCellValue} beneficiaryType={beneficiaryType} />
      ) : (
      <div className="progress-report-table-shell">
        <table className="progress-report-table">
          <thead>
            <tr>
              <th>Report field</th>
              {resultsRows.map((row, index) => <th key={`column-${row.historyRowKey || index}`}>{columnLabel(row, index)}</th>)}
            </tr>
          </thead>
          <tbody>
            {customizedFields.map(([id, label]) => (
              <tr key={id}>
                <th scope="row">{label}</th>
                {resultsRows.map((row, index) => (
                  <td key={`${id}-${row.historyRowKey || index}`}>{formatCellValue(id, row[id])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
