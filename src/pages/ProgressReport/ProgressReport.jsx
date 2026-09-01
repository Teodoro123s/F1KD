import React, { useEffect, useMemo, useState } from 'react';
import { useMothers } from '../../context/MothersContext';
import { useAuth } from '../../auth/AuthProvider';
import { apiGetChildren } from '../../api/children';
import ProgressReportTable from './ProgressReportTable';
import ProgressReportToolbar from './components/ProgressReportToolbar';
import ProgressReportFilterBar from './components/ProgressReportFilterBar';
import ProgressReportComparisonModal from './components/ProgressReportComparisonModal';
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

export default function ProgressReport() {
  const { mothers, refreshMothers } = useMothers();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('Master List');
  const [search, setSearch] = useState('');
  const [children, setChildren] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [school, setSchool] = useState('All Schools');
  const [group, setGroup] = useState('All Groups');
  const [batch, setBatch] = useState('All Batches');
  const [beneficiaryType, setBeneficiaryType] = useState('Mothers');
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareMode, setCompareMode] = useState('Beneficiaries');
  const [comparison, setComparison] = useState(null);
  const [historyComparison, setHistoryComparison] = useState(null);
  const [underweightDrilldown, setUnderweightDrilldown] = useState(null);
  const roleName = currentUser?.role || 'default';
  const currentEntityColumns = useMemo(() => getReportColumnsForEntity(beneficiaryType), [beneficiaryType]);
  const defaultVisibleColumns = useMemo(() => getDefaultVisibleColumns(roleName, beneficiaryType), [roleName, beneficiaryType]);
  const savedColumnPreferenceKey = `progress-report-columns-${roleName}-${beneficiaryType}`;
  const [fieldSearch, setFieldSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(() => Object.fromEntries(getFieldGroups(beneficiaryType).map((group) => [group, true])));
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const savedValue = localStorage.getItem(savedColumnPreferenceKey);
      if (savedValue) {
        const parsed = JSON.parse(savedValue);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (error) {
      console.warn('[ProgressReport] Unable to read saved column preferences:', error);
    }
    return defaultVisibleColumns;
  });
  const [showColumns, setShowColumns] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(savedColumnPreferenceKey, JSON.stringify(visibleColumns));
    } catch (error) {
      console.warn('[ProgressReport] Unable to save column preferences:', error);
    }
  }, [savedColumnPreferenceKey, visibleColumns]);

  useEffect(() => {
    const nextDefaults = getDefaultVisibleColumns(roleName, beneficiaryType);
    setVisibleColumns((current) => {
      const merged = current.filter((id) => currentEntityColumns.some((column) => column.id === id));
      if (!merged.length) return nextDefaults;
      return merged;
    });
    setExpandedGroups(() => Object.fromEntries(getFieldGroups(beneficiaryType).map((group) => [group, true])));
  }, [roleName, beneficiaryType, currentEntityColumns]);

  useEffect(() => {
    let active = true;
    if (beneficiaryType === 'Mothers') {
      const selectedFields = buildRequestFields();
      refreshMothers(selectedFields);
      return () => { active = false; };
    }

    setLoadingChildren(true);
    apiGetChildren(buildRequestFields())
      .then((payload) => { if (active) setChildren(Array.isArray(payload) ? payload : payload?.children || []); })
      .catch(() => { if (active) setChildren([]); })
      .finally(() => { if (active) setLoadingChildren(false); });
    return () => { active = false; };
  }, [beneficiaryType, refreshMothers, visibleColumns]);

  const allRows = useMemo(() => (beneficiaryType === 'Mothers' ? mothers.map(normalizeMother) : children.map(normalizeChild)), [beneficiaryType, children, mothers]);

  const searchFilters = useMemo(() => SEARCH_FILTER_RULES.flatMap((rule) => {
    const match = search.match(rule.pattern);
    if (!match) return [];
    return [{ id: `search-${rule.id}`, label: rule.getLabel ? rule.getLabel(match) : rule.label, pattern: rule.pattern }];
  }), [search]);

  const comparisonRequest = useMemo(() => {
    if (beneficiaryType !== 'Mothers' || !/\binitial\b[\s\w-]*\bbmi\b/i.test(search)) return null;
    const groupMatch = search.match(/\bgroup\s+([a-z0-9-]+)/i);
    const batchMatch = search.match(/\bbatches?\s+([a-z0-9-]+)\s*(?:and|&)\s*([a-z0-9-]+)/i);
    if (!groupMatch || !batchMatch) return null;
    return { group: groupMatch[1], batches: [batchMatch[1], batchMatch[2]] };
  }, [beneficiaryType, search]);

  const comparisonCohorts = useMemo(() => {
    if (!comparisonRequest) return [];
    return comparisonRequest.batches.map((batchName) => {
      const members = allRows.filter((row) => matchesEntityToken(row.group, comparisonRequest.group) && matchesEntityToken(row.batch, batchName) && row.initialBmiCategory !== 'Not recorded');
      const distribution = ['Underweight', 'Normal', 'Overweight', 'Obese'].map((category) => ({ category, count: members.filter((row) => row.initialBmiCategory === category).length }));
      return { name: batchName, members, distribution, total: members.length, underweight: members.filter((row) => row.initialBmiCategory === 'Underweight').length };
    });
  }, [allRows, comparisonRequest]);

  const activeFilterCount = [
    school !== 'All Schools',
    group !== 'All Groups',
    batch !== 'All Batches',
    ...searchFilters.map(() => true),
    beneficiaryType !== 'Mothers',
  ].filter(Boolean).length;

  const filteredRows = useMemo(() => allRows.filter((row) => {
    const query = search.toLowerCase();
    const remainingQuery = SEARCH_FILTER_RULES.reduce((value, rule) => value.replace(rule.pattern, ''), query).replace(/\s{2,}/g, ' ').trim();
    const textMatch = !remainingQuery || [row.name, row.id, row.trimester, row.school, row.community, row.group, row.batch].join(' ').toLowerCase().includes(remainingQuery);
    const scopeMatch = (school === 'All Schools' || row.school === school || row.community === school) && (group === 'All Groups' || row.group === group) && (batch === 'All Batches' || row.batch === batch);
    const parsedMatch = searchFilters.every((filter) => {
      if (filter.id === 'search-risk') return row.risk;
      if (filter.id === 'search-trimester') return row.trimester.toLowerCase().includes(filter.label.split(': ')[1].toLowerCase());
      if (filter.id === 'search-progress') return row.progress <= 25;
      if (filter.id === 'search-bmi') return String(row.bmi).toLowerCase().includes(filter.label.split(': ')[1].toLowerCase());
      if (filter.id === 'search-birth-cert') return !row.birthCert;
      if (filter.id === 'search-consent') return !row.consent;
      if (filter.id === 'search-vaccine') return row.tt?.some((date) => !hasValue(date));
      if (filter.id === 'search-dental') return row.dental;
      if (filter.id === 'search-gpa') return Number(row.source?.gravida) === 1;
      return true;
    });
    return textMatch && scopeMatch && parsedMatch;
  }), [allRows, batch, group, school, search, searchFilters]);

  const schoolOptions = useMemo(() => ['All Schools', ...new Set(allRows.map((row) => row.school || row.community).filter(Boolean))], [allRows]);
  const schoolRows = useMemo(() => school === 'All Schools' ? allRows : allRows.filter((row) => (row.school || row.community) === school), [allRows, school]);
  const groupOptions = useMemo(() => ['All Groups', ...new Set(schoolRows.map((row) => row.group).filter(Boolean))], [schoolRows]);
  const groupRows = useMemo(() => group === 'All Groups' ? schoolRows : schoolRows.filter((row) => row.group === group), [group, schoolRows]);
  const batchOptions = useMemo(() => ['All Batches', ...new Set(groupRows.map((row) => row.batch).filter(Boolean))], [groupRows]);

  const rankedRows = useMemo(() => {
    const aggregate = (field, label) => Object.entries(filteredRows.reduce((groups, row) => {
      const key = row[field] || `Unassigned ${label}`;
      groups[key] = groups[key] || [];
      groups[key].push(row);
      return groups;
    }, {})).map(([name, rows]) => ({
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
  }, [filteredRows]);

  const compareCandidates = compareMode === 'Beneficiaries' ? filteredRows : compareMode === 'Checkups' ? filteredRows.filter((row) => row.type === 'Mothers') : rankedRows.filter((row) => row.type === (compareMode === 'Groups' ? 'Group' : 'Batch'));
  const displayedRows = activeTab === 'Ranked List' ? rankedRows : filteredRows;

  const openComparison = () => {
    if (compareMode === 'Checkups') {
      const selected = filteredRows.find((row, index) => compareIds.includes(getRowKey(row, index)));
      if (selected) showHistory(selected);
      return;
    }
    const selected = compareMode === 'Beneficiaries'
      ? filteredRows.filter((row, index) => compareIds.includes(getRowKey(row, index)))
      : compareCandidates.filter((row, index) => compareIds.includes(getRowKey(row, index)));
    if (selected.length === 2) {
      setComparison({ mode: compareMode, rows: selected });
      setCompareOpen(false);
    }
  };

  function showHistory(row) {
    const checkups = Array.isArray(row.source?.checkups) ? row.source.checkups.flat().filter((checkup) => checkup?.checkupDate).sort((a, b) => new Date(a.checkupDate) - new Date(b.checkupDate)) : [];
    if (checkups.length < 2) {
      setHistoryComparison({ name: row.name, checkups, message: 'At least two completed checkups are needed for a history comparison.' });
      return;
    }
    setHistoryComparison({ name: row.name, checkups: checkups.slice(-2) });
  }

  useEffect(() => {
    if (!schoolOptions.includes(school)) setSchool('All Schools');
  }, [school, schoolOptions]);

  useEffect(() => {
    if (!groupOptions.includes(group)) setGroup('All Groups');
  }, [group, groupOptions]);

  useEffect(() => {
    if (!batchOptions.includes(batch)) setBatch('All Batches');
  }, [batch, batchOptions]);

  const downloadReport = () => {
    const columns = currentEntityColumns.filter((column) => visibleColumns.includes(column.id));
    const csvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = [columns.map((column) => csvValue(column.label)).join(',')];
    filteredRows.forEach((row) => lines.push(columns.map((column) => csvValue(column.id === 'progress' ? `${row.progress}%` : column.id === 'name' ? row.name : column.id === 'id' ? row.id : column.id === 'trimester' ? row.trimester : column.id === 'assessment' ? row.assessment : column.id === 'trend' ? row.trend : row[column.id] ?? '')).join(',')));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    link.download = `progress-report-${beneficiaryType.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const buildRequestFields = () => {
    const selectedIds = visibleColumns.filter((id) => currentEntityColumns.some((column) => column.id === id));
    return selectedIds.length ? selectedIds : defaultVisibleColumns;
  };

  useEffect(() => {
    const selectedFields = buildRequestFields();
    if (typeof window !== 'undefined') {
      window.__progressReportFields = selectedFields;
    }
  }, [visibleColumns, roleName, defaultVisibleColumns]);

  const toggleCompare = (rowKey) => setCompareIds((current) => current.includes(rowKey) ? current.filter((item) => item !== rowKey) : [...current, rowKey].slice(-2));

  const filteredFieldOptions = useMemo(() => {
    const query = fieldSearch.trim().toLowerCase();
    return getFieldGroups(beneficiaryType).map((group) => ({
      group,
      items: currentEntityColumns.filter((column) => column.category === group && (!query || column.label.toLowerCase().includes(query) || column.id.toLowerCase().includes(query))),
    })).filter((entry) => entry.items.length > 0);
  }, [beneficiaryType, currentEntityColumns, fieldSearch]);

  return (
    <div className="progress-report-shell">
      <div className="progress-report-panel">
        <ProgressReportFilterBar
          activeFilterCount={activeFilterCount}
          showAllFilters={showAllFilters}
          setShowAllFilters={setShowAllFilters}
          school={school}
          setSchool={setSchool}
          group={group}
          setGroup={setGroup}
          batch={batch}
          setBatch={setBatch}
          schoolOptions={schoolOptions}
          groupOptions={groupOptions}
          batchOptions={batchOptions}
          search={search}
          setSearch={setSearch}
          searchFilters={searchFilters}
          beneficiaryType={beneficiaryType}
          setBeneficiaryType={setBeneficiaryType}
          comparisonRequest={comparisonRequest}
        />

        <ProgressReportToolbar
          activeTab={activeTab}
          tabs={REPORT_TABS}
          compareIds={compareIds}
          onTabChange={setActiveTab}
          onCompareClick={() => {
            setCompareMode(activeTab === 'Ranked List' ? 'Groups' : 'Beneficiaries');
            setCompareIds([]);
            setCompareOpen(true);
          }}
          onDownload={downloadReport}
        />

        <div className="progress-report-alert">
          <span className="alert-icon">!</span>
          <span><strong>Insight Alert:</strong> 12 beneficiaries stuck at 0% progress for 2 weeks. Review cases.</span>
        </div>

        {comparisonRequest && <section className="comparison-dashboard" aria-label="Initial BMI batch comparison">
          <div className="comparison-dashboard-heading">
            <div><h2>Initial BMI by Batch</h2><p>Group {comparisonRequest.group}, mothers' first recorded assessment</p></div>
            <span className="analysis-badge">Initial assessment only</span>
          </div>
          <div className="comparison-cohorts">
            {comparisonCohorts.map((cohort) => <article key={cohort.name} className="comparison-cohort">
              <h3>Batch {cohort.name}</h3><strong>{cohort.total ? Math.round((cohort.underweight / cohort.total) * 100) : 0}%</strong><span>underweight ({cohort.underweight} of {cohort.total})</span>
              <div className="distribution-chart">{cohort.distribution.map((item) => <div key={item.category} className="distribution-row"><span>{item.category}</span><div><i style={{ width: `${cohort.total ? (item.count / cohort.total) * 100 : 0}%` }} /></div><b>{item.count}</b></div>)}</div>
              <button type="button" className="drilldown-btn" onClick={() => setUnderweightDrilldown(cohort)}>View underweight mothers</button>
            </article>)}
          </div>
        </section>}

        <div className="progress-report-table-wrap">
          <div className="progress-report-table-header">
            <span>Table ({beneficiaryType})</span>
            <div className="table-header-actions">
              <div className="columns-control">
                <button type="button" className="manage-columns-btn" onClick={() => setShowColumns((visible) => !visible)} aria-expanded={showColumns}>Manage Columns</button>
                {showColumns && (
                  <div className="columns-menu" data-entity={beneficiaryType}>
                    <div className="columns-search-wrap">
                      <input
                        type="text"
                        className="columns-search"
                        placeholder="Search fields..."
                        value={fieldSearch}
                        onChange={(event) => setFieldSearch(event.target.value)}
                      />
                    </div>
                    {filteredFieldOptions.length === 0 ? (
                      <div className="columns-empty-state">No matching fields</div>
                    ) : (
                      filteredFieldOptions.map(({ group, items }) => (
                        <div key={group} className="field-group">
                          <button
                            type="button"
                            className="field-group-toggle"
                            onClick={() => setExpandedGroups((current) => ({ ...current, [group]: !current[group] }))}
                          >
                            {group} <span>{expandedGroups[group] ? '▾' : '▸'}</span>
                          </button>
                          {expandedGroups[group] && (
                            <div className="field-group-list">
                              {items.map((column) => (
                                <label key={column.id} className="field-option">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns.includes(column.id)}
                                    onChange={() => setVisibleColumns((current) => current.includes(column.id) ? current.filter((id) => id !== column.id) : [...current, column.id])}
                                  />
                                  <span>{column.label}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    <div className="columns-actions-row">
                      <button type="button" className="ghost-btn" onClick={() => setVisibleColumns(defaultVisibleColumns)}>Reset to default</button>
                      <button type="button" className="primary-btn" onClick={() => setShowColumns(false)}>Apply</button>
                    </div>
                  </div>
                )}
              </div>
              <span className="results-count">{loadingChildren ? 'Loading...' : `${filteredRows.length} results`}</span>
            </div>
          </div>
          {comparison && <div className="comparison-result"><strong>{comparison.mode} comparison</strong>{comparison.rows.map((row) => <span key={row.id}>{row.name}: {row.progress}% progress</span>)}<strong>Delta: {formatDelta(comparison.rows[1]?.progress, comparison.rows[0]?.progress)}</strong><button type="button" onClick={() => setComparison(null)}>Dismiss</button></div>}
          {activeTab === 'Graph View' ? <div className="progress-report-graph" aria-label="Progress distribution graph">
            {['0-25%', '26-50%', '51-75%', '76-100%'].map((range, index) => {
              const count = filteredRows.filter((row) => row.progress >= index * 25 && row.progress <= (index + 1) * 25).length;
              return <div key={range} className="graph-bar-row"><span>{range}</span><div><i style={{ width: `${filteredRows.length ? (count / filteredRows.length) * 100 : 0}%` }} /></div><strong>{count}</strong></div>;
            })}
          </div> : <ProgressReportTable activeTab={activeTab} displayedRows={displayedRows} compareIds={compareIds} toggleCompare={toggleCompare} showHistory={showHistory} visibleColumns={visibleColumns} columns={currentEntityColumns} />}
        </div>
      </div>
      <ProgressReportComparisonModal
        compareMode={compareMode}
        setCompareMode={(mode) => {
          setCompareMode(mode);
          setCompareIds([]);
        }}
        compareOpen={compareOpen}
        setCompareOpen={setCompareOpen}
        compareIds={compareIds}
        compareCandidates={compareCandidates}
        getRowKey={getRowKey}
        toggleCompare={toggleCompare}
        openComparison={openComparison}
      />
      {historyComparison && <div className="report-modal-backdrop" role="presentation" onClick={() => setHistoryComparison(null)}><div className="report-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><h2>Checkup History: {historyComparison.name}</h2>{historyComparison.message ? <p>{historyComparison.message}</p> : <><div className="history-comparison">{historyComparison.checkups.map((checkup) => <div key={checkup.id || checkup.checkupDate}><strong>{formatDate(checkup.checkupDate)}</strong><span>Trimester: {checkup.trimester || 'Not recorded'}</span><span>Weight: {checkup.weight || 'Not recorded'}</span><span>Blood pressure: {checkup.bp || 'Not recorded'}</span><span>BMI: {checkup.bmi || 'Not recorded'}</span></div>)}</div><p className="history-delta">BMI change: {formatDelta(historyComparison.checkups[1]?.bmi, historyComparison.checkups[0]?.bmi)}</p></>}<div className="report-modal-actions"><button type="button" className="primary-btn" onClick={() => setHistoryComparison(null)}>Close</button></div></div></div>}
      {underweightDrilldown && <div className="report-modal-backdrop" role="presentation" onClick={() => setUnderweightDrilldown(null)}><div className="report-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><h2>Underweight mothers: Batch {underweightDrilldown.name}</h2><p>Group {comparisonRequest.group}, based on the first recorded BMI assessment.</p><div className="drilldown-list">{underweightDrilldown.members.filter((row) => row.initialBmiCategory === 'Underweight').map((row) => <div key={row.id}><strong>{row.name}</strong><span>{row.id}</span><small>Initial BMI: {row.initialBmi}</small></div>)}</div><div className="report-modal-actions"><button type="button" className="primary-btn" onClick={() => setUnderweightDrilldown(null)}>Close</button></div></div></div>}
    </div>
  );
}
