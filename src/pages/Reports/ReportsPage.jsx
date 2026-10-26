import React, { useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import ModuleSummaryCards from '../../components/ui/ModuleSummaryCards';
import CommunityTable from '../Community/CommunityTable';
import CommunityPagination from '../Community/components/CommunityPagination';
import { apiGetActivityReport, apiGetActivityUsers, apiGetReportScopes } from '../../api/reports';
import { fillDailyTimeSeries, getRollingDateRange } from '../../utils/analytics/dailyTimeSeries';

const EMPTY_COUNTS = { signIns: 0 };

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return {
    date: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date),
    time: new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date),
    iso: date.toISOString(),
  };
}

function formatAction(action) {
  if (action === 'sign_in') return 'Signed in';
  return String(action || '')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toLocalDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateRange(preset) {
  if (preset === 'all') return { from: '', to: '' };
  const today = new Date();
  const end = toLocalDateInputValue(today);
  const daysBack = preset === 'week' ? 6 : preset === 'month' ? 29 : 0;
  today.setDate(today.getDate() - daysBack);
  return { from: toLocalDateInputValue(today), to: end };
}

function exportCsv(rows, fields, filename) {
  const csv = [
    fields.map((field) => field.label),
    ...rows.map((row) => fields.map(({ key }) => row[key] ?? '')),
  ].map((line) => line.map((value) => {
    const text = String(value);
    const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ActivityChart({
  dailyActivity,
  onPointSelect,
  title = 'Activity over time',
  ariaLabel = 'Daily user login activity',
  emptyMessage = 'No login recorded for the selected scope and period.',
  itemLabel = 'activity',
  description = '',
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const width = 760;
  const height = 280;
  const padding = { top: 26, right: 18, bottom: 54, left: 52 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxCount = Math.max(1, ...dailyActivity.map((item) => Number(item.count) || 0));
  const slotWidth = dailyActivity.length ? plotWidth / dailyActivity.length : plotWidth;
  const tickStep = Math.max(1, Math.ceil(maxCount / 4));
  const niceMaximum = Math.ceil(maxCount / tickStep) * tickStep;
  const yTicks = Array.from({ length: niceMaximum / tickStep + 1 }, (_, index) => index * tickStep);
  const points = dailyActivity.map((item, index) => ({
    ...item,
    count: Number(item.count) || 0,
    x: padding.left + index * slotWidth + slotWidth / 2,
    y: padding.top + plotHeight - ((Number(item.count) || 0) / niceMaximum) * plotHeight,
  }));
  const total = points.reduce((sum, item) => sum + item.count, 0);
  const peak = points.reduce((current, item) => item.count > current.count ? item : current, { count: 0 });
  const itemLabelPlural = itemLabel === 'activity' ? 'activities' : `${itemLabel}s`;
  const peakDate = peak.date
    ? new Date(`${peak.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '';
  const hasActivity = total > 0;

  return (
    <section className="report-chart-card" aria-label={title}>
      <h2>{title}</h2>
      {description && <p className="report-chart-description">{description}</p>}
      {hasActivity ? (
        <p className="report-chart-summary">
          <strong>{total.toLocaleString()} {itemLabelPlural}</strong>
          <span>Peak: {peak.count.toLocaleString()} on {peakDate}</span>
        </p>
      ) : null}
      {hasActivity ? (
        <div className="report-chart-scroll">
          <svg
            className="report-activity-chart"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            role="group"
            aria-label={ariaLabel}
          >
            {yTicks.map((tick) => {
              const y = padding.top + plotHeight - (tick / niceMaximum) * plotHeight;
              return (
                <g key={tick}>
                  <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />
                  <text x={padding.left - 9} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11">{tick}</text>
                </g>
              );
            })}
            {points.map((item, index) => {
              const barWidth = Math.min(22, Math.max(4, slotWidth * 0.62));
              const barHeight = item.count ? Math.max(2, padding.top + plotHeight - item.y) : 0;
              const showValue = item.count > 0 && (points.length <= 12 || item.count === peak.count);
              const dateLabelStep = Math.max(1, Math.ceil(points.length / 6));
              return (
                <g
                  key={item.date}
                  className="report-chart-bar"
                  tabIndex="0"
                  role="button"
                  aria-label={`${item.date}: ${item.count} ${item.count === 1 ? itemLabel : itemLabelPlural}. View ${itemLabelPlural} for this day.`}
                  onClick={() => onPointSelect?.(item.date)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onPointSelect?.(item.date);
                    }
                  }}
                  onMouseEnter={() => setHoveredPoint(item)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onFocus={() => setHoveredPoint(item)}
                  onBlur={() => setHoveredPoint(null)}
                >
                  <title>{`${item.date}: ${item.count} ${item.count === 1 ? itemLabel : itemLabelPlural}`}</title>
                  <rect
                    className="report-chart-bar__hit-area"
                    x={item.x - Math.max(barWidth / 2, 7)}
                    y={padding.top}
                    width={Math.max(barWidth, 14)}
                    height={plotHeight + 2}
                    fill="transparent"
                  />
                  <rect
                    className="report-chart-bar__value"
                    x={item.x - barWidth / 2}
                    y={item.y}
                    width={barWidth}
                    height={barHeight}
                    rx={Math.min(5, barWidth / 3)}
                    fill="#2563eb"
                  />
                  {showValue && (
                    <text x={item.x} y={Math.max(padding.top - 7, item.y - 8)} textAnchor="middle" fill="#1d4ed8" fontSize="11" fontWeight="700">
                      {item.count}
                    </text>
                  )}
                  {(index === 0 || index === points.length - 1 || index % dateLabelStep === 0) && (
                    <text
                      x={item.x}
                      y={height - padding.bottom + 20}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="11"
                    >
                      {new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </text>
                  )}
                </g>
              );
            })}
            {hoveredPoint && (() => {
              const tooltipWidth = 150;
              const tooltipHeight = 40;
              const tooltipX = Math.max(4, Math.min(width - tooltipWidth - 4, hoveredPoint.x - tooltipWidth / 2));
              const tooltipY = Math.max(4, hoveredPoint.y - tooltipHeight - 12);
              return (
                <g className="report-chart-tooltip" pointerEvents="none">
                  <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="6" fill="#0f172a" />
                  <text x={tooltipX + 9} y={tooltipY + 15} fill="#cbd5e1" fontSize="10">
                    {new Date(`${hoveredPoint.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </text>
                  <text x={tooltipX + 9} y={tooltipY + 31} fill="#fff" fontSize="12" fontWeight="600">
                    {hoveredPoint.count} {hoveredPoint.count === 1 ? itemLabel : itemLabelPlural}
                  </text>
                </g>
              );
            })()}
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={padding.top + plotHeight}
              y2={padding.top + plotHeight}
              stroke="#94a3b8"
            />
            <text x={padding.left + plotWidth / 2} y={height - 2} textAnchor="middle" fill="#64748b" fontSize="10">Date</text>
            <text x="12" y={padding.top + plotHeight / 2} textAnchor="middle" fill="#64748b" fontSize="10" transform={`rotate(-90 12 ${padding.top + plotHeight / 2})`}>
              {itemLabelPlural === 'activities' ? 'Activities' : 'Logins'}
            </text>
          </svg>
        </div>
      ) : (
        <p className="report-muted">{emptyMessage}</p>
      )}
    </section>
  );
}

export default function ReportsPage() {
  const [selectedCard, setSelectedCard] = useState(null);
  const [scopeLevel, setScopeLevel] = useState('school');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [viewMode, setViewMode] = useState('graph');
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [dateRangePreset, setDateRangePreset] = useState('all');
  const [selectedGraphDate, setSelectedGraphDate] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [report, setReport] = useState({ activities: [], total: 0, counts: EMPTY_COUNTS });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const action = 'sign_in';
  const reportSchoolId = scopeLevel === 'school' || scopeLevel === 'group' ? selectedSchoolId : '';
  const reportGroupId = scopeLevel === 'group' ? selectedGroupId : '';
  const reportActorUserId = scopeLevel === 'individual' ? selectedUserId : '';
  const presetDateRange = getDateRange(dateRangePreset);
  const from = selectedGraphDate || presetDateRange.from;
  const to = selectedGraphDate || presetDateRange.to;
  const recentChartRange = useMemo(() => getRollingDateRange(30), []);
  const chartFrom = from || recentChartRange.from;
  const chartTo = to || recentChartRange.to;
  const visibleGroups = selectedSchoolId
    ? groups.filter((group) => String(group.schoolId) === String(selectedSchoolId))
    : groups;
  const visibleUsers = users.filter((user) => {
    if (scopeLevel === 'school' && selectedSchoolId) return String(user.schoolId || '') === String(selectedSchoolId);
    if (scopeLevel === 'group' && selectedGroupId) return String(user.groupId || '') === String(selectedGroupId);
    return true;
  });

  useEffect(() => {
    if (!selectedCard) return undefined;
    let active = true;
    Promise.all([apiGetActivityUsers(), apiGetReportScopes()])
      .then(([userResponse, scopeResponse]) => {
        if (!active) return;
        setUsers(userResponse.users || []);
        setSchools(scopeResponse.schools || []);
        setGroups(scopeResponse.groups || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load users for login reports.');
      });
    return () => { active = false; };
  }, [selectedCard]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    apiGetActivityReport({
      page,
      perPage,
      action,
      actorUserId: reportActorUserId,
      schoolId: reportSchoolId,
      groupId: reportGroupId,
      search,
      from,
      to,
      chartFrom,
      chartTo,
    })
      .then((response) => {
        if (!active) return;
        setReport({
          activities: response.activities || [],
          dailyActivity: fillDailyTimeSeries(response.dailyActivity || [], chartFrom, chartTo),
          total: Number(response.total) || 0,
          counts: { ...EMPTY_COUNTS, ...(response.counts || {}) },
        });
      })
      .catch((requestError) => {
        if (!active) return;
        setReport({ activities: [], dailyActivity: [], total: 0, counts: EMPTY_COUNTS });
        setError(requestError.message || 'Unable to load login reports.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, perPage, action, reportActorUserId, reportSchoolId, reportGroupId, search, from, to, chartFrom, chartTo]);

  const pageCount = Math.max(1, Math.ceil(report.total / perPage));
  const columns = useMemo(() => [
    {
      key: 'createdAt',
      header: 'Date & time',
      className: 'reports-date-cell',
      renderCell: (row) => {
        const formatted = formatDate(row.createdAt);
        if (formatted === '—') return formatted;
        return (
          <time className="reports-timestamp" dateTime={formatted.iso}>
            <span>{formatted.date}</span>
            <span>{formatted.time}</span>
          </time>
        );
      },
      style: { width: '16%' },
    },
    {
      key: 'actor',
      header: 'User',
      style: { width: '28%' },
      renderCell: (row) => (
        <div className="reports-login-user">
          <strong>{row.actorName || 'Unknown user'}</strong>
          {row.actorEmail && <div className="report-muted reports-login-user-email">{row.actorEmail}</div>}
        </div>
      ),
    },
    { key: 'actorRole', header: 'Role', style: { width: '17%' } },
    {
      key: 'action',
      header: 'Activity',
      style: { width: '16%' },
      renderCell: (row) => formatAction(row.action),
    },
    { key: 'description', header: 'Details', style: { width: '23%' } },
  ], []);

  const start = report.total ? (page - 1) * perPage + 1 : 0;
  const end = Math.min(page * perPage, report.total);

  return (
    <div className="community-page">
      <PageHeader
        title="Reports"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Reports' }]}
        actions={selectedCard ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => viewMode === 'graph'
              ? exportCsv(report.dailyActivity || [], [
                { key: 'date', label: 'Date' },
                { key: 'count', label: 'Login Count' },
              ], 'f1kd-login-graph-data.csv')
              : exportCsv(report.activities, [
                { key: 'createdAt', label: 'Date & Time' },
                { key: 'actorName', label: 'User' },
                { key: 'actorEmail', label: 'Email' },
                { key: 'actorRole', label: 'Role' },
                { key: 'action', label: 'Activity' },
                { key: 'entityType', label: 'Entity Type' },
                { key: 'entityId', label: 'Entity ID' },
                { key: 'description', label: 'Details' },
              ], 'f1kd-login-table-data.csv')}
            disabled={loading || (viewMode === 'graph' ? !(report.dailyActivity || []).some((item) => Number(item.count) > 0) : !report.activities.length)}
          >
            Download {viewMode === 'graph' ? 'graph data' : 'table page'} CSV
          </button>
        ) : null}
      />
      <p className="reports-intro">Review successful user login records by school, group, or individual account. Super Admin accounts and their sign-ins are excluded from report users, totals, charts, and tables. School and group reports use users’ current assignments.</p>
      <ModuleSummaryCards
        selected={selectedCard}
        toggleOnSelect
        onSelect={(key) => {
          setSelectedCard(key);
          setPage(1);
        }}
        cards={[
          { key: 'signIns', label: 'User Logins', value: report.counts.signIns, description: 'View login logs', selectedDescription: 'Hide login logs' },
        ]}
      />

      {selectedCard ? (
        <>
          {error && <div role="alert" className="error-message">{error}</div>}
          <section className="reports-toolbar" aria-label="Report controls">
            <div className={`reports-filter-grid reports-filter-grid--${scopeLevel}`} aria-label="Report filters">
              <label className="reports-filter-field">
              <span>Report level</span>
              <select
                value={scopeLevel}
                aria-label="Report level"
                onChange={(event) => {
                  setScopeLevel(event.target.value);
                  setSelectedGraphDate('');
                  setSelectedSchoolId('');
                  setSelectedGroupId('');
                  setSelectedUserId('');
                  setPage(1);
                }}
              >
                <option value="school">School</option>
                <option value="group">Group</option>
                <option value="individual">Individual</option>
              </select>
            </label>
            {(scopeLevel === 'school' || scopeLevel === 'group') && (
              <label className="reports-filter-field">
                <span>School</span>
                <select
                  value={selectedSchoolId}
                  aria-label="School"
                  onChange={(event) => {
                    setSelectedSchoolId(event.target.value);
                    setSelectedGraphDate('');
                    setSelectedGroupId('');
                    setPage(1);
                  }}
                >
                  <option value="">All schools</option>
                  {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
                </select>
              </label>
            )}
            {scopeLevel === 'group' && (
              <label className="reports-filter-field">
                <span>Group</span>
                <select
                  value={selectedGroupId}
                  aria-label="Group"
                  onChange={(event) => { setSelectedGroupId(event.target.value); setSelectedGraphDate(''); setPage(1); }}
                >
                  <option value="">All groups</option>
                  {visibleGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
              </label>
            )}
            {scopeLevel === 'individual' && (
              <label className="reports-filter-field">
                <span>Activity performed by</span>
                <select
                  value={selectedUserId}
                  aria-label="Activity performed by"
                  onChange={(event) => { setSelectedUserId(event.target.value); setSelectedGraphDate(''); setPage(1); }}
                >
                  <option value="">All users</option>
                  {visibleUsers.map((user) => (
                    <option key={`${user.id ?? 'deleted'}-${user.email || user.name}`} value={user.id ?? ''}>
                      {user.name}{user.email ? ` (${user.email})` : ''}{user.id ? '' : ' (deleted account)'}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="reports-filter-field reports-search">
              <span>Search activity</span>
              <input
                type="search"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                placeholder="User, action, or details"
              />
            </label>
            </div>
            <div className="reports-date-range" aria-label="Date range">
              <label className="reports-filter-field">
                <span>Date range</span>
                <select
                  value={dateRangePreset}
                  aria-label="Date range"
                  onChange={(event) => { setDateRangePreset(event.target.value); setSelectedGraphDate(''); setPage(1); }}
                >
                  <option value="all">All time</option>
                  <option value="today">Today</option>
                  <option value="week">Past week</option>
                  <option value="month">Past month</option>
                </select>
              </label>
            </div>
            <div className="reports-toolbar-footer">
              <span className="reports-toolbar-label">Display</span>
              <div className="reports-view-switch" role="group" aria-label="Activity view">
                <button type="button" className={viewMode === 'graph' ? 'is-active' : ''} aria-pressed={viewMode === 'graph'} onClick={() => { setSelectedGraphDate(''); setViewMode('graph'); }}>Graph view</button>
                <button type="button" className={viewMode === 'table' ? 'is-active' : ''} aria-pressed={viewMode === 'table'} onClick={() => setViewMode('table')}>Table view</button>
              </div>
            </div>
          </section>
          {viewMode === 'graph' ? (
            <ActivityChart
              dailyActivity={report.dailyActivity || []}
              onPointSelect={(date) => {
                setSelectedGraphDate(date);
                setViewMode('table');
                setPage(1);
              }}
              title={scopeLevel === 'individual' && selectedUserId
                ? 'Individual user logins over time'
                : `${scopeLevel === 'individual' ? 'Individual' : scopeLevel === 'group' ? 'Group' : 'School'} logins over time`}
              ariaLabel={`Daily ${scopeLevel} user login activity`}
              itemLabel="login"
              description={dateRangePreset === 'all' && !selectedGraphDate
                ? 'Daily totals for the past 30 calendar days. Table view retains all matching records.'
                : 'Select a day to view its matching login records.'}
            />
          ) : (
            <>
              {selectedGraphDate && (
                <div className="reports-day-filter" role="status">
                  <span>
                    Showing activity for {new Date(`${selectedGraphDate}T00:00:00`).toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </span>
                  <button type="button" onClick={() => { setSelectedGraphDate(''); setPage(1); }}>
                    Clear day filter
                  </button>
                </div>
              )}
              <div className="reports-table-wrap">
                <CommunityTable
                  columns={columns}
                  data={report.activities}
                  rowKey="id"
                  tableClassName="reports-login-table"
                  tableTitle={loading ? 'Loading login logs…' : 'User login report'}
                  emptyMessage={loading ? 'Loading login logs…' : 'No login records found for these filters.'}
                />
              </div>
              <CommunityPagination
                currentPage={page}
                pageCount={pageCount}
                onPageChange={setPage}
                perPage={perPage}
                onPerPageChange={(value) => { setPerPage(Number(value)); setPage(1); }}
                rangeStart={start}
                rangeEnd={end}
                totalItems={report.total}
              />
            </>
          )}
        </>
      ) : (
        <p className="reports-hint">Select the card to view user login logs.</p>
      )}
      <style>{`
        .reports-intro { margin: -0.25rem 0 1rem; color: #64748b; }
        .reports-hint { margin: 1.25rem 0; color: #64748b; text-align: center; }
        .reports-toolbar { display: grid; gap: 1rem; margin: 1rem 0; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
        .reports-filter-grid { display: grid; gap: 0.85rem; align-items: end; }
        .reports-filter-grid--school { grid-template-columns: minmax(145px, 0.65fr) minmax(200px, 1fr) minmax(260px, 2fr); }
        .reports-filter-grid--group { grid-template-columns: minmax(145px, 0.65fr) minmax(180px, 1fr) minmax(180px, 1fr) minmax(240px, 1.5fr); }
        .reports-filter-grid--individual { grid-template-columns: minmax(145px, 0.65fr) minmax(280px, 1.5fr) minmax(260px, 1.5fr); }
        .reports-filter-field { display: grid; min-width: 0; gap: 0.4rem; color: #475569; font-size: 0.85rem; }
        .reports-filter-field input, .reports-filter-field select { box-sizing: border-box; width: 100%; min-width: 0; min-height: 42px; padding: 0.5rem 0.7rem; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #0f172a; font: inherit; }
        .reports-date-range { display: flex; flex-wrap: wrap; gap: 0.85rem; }
        .reports-date-range .reports-filter-field { width: min(100%, 260px); }
        .reports-toolbar-footer { display: flex; align-items: center; gap: 0.8rem; padding-top: 0.85rem; border-top: 1px solid #e2e8f0; }
        .reports-toolbar-label { color: #475569; font-size: 0.85rem; font-weight: 600; }
        .report-muted { color: #64748b; font-size: 0.82rem; margin-top: 0.2rem; }
        .reports-table-wrap { overflow: hidden; border: 1px solid #dfe6ee; border-radius: 12px; background: #fff; }
        .reports-table-wrap .table-card { background: #fff; border: 0; border-radius: 0; }
        .reports-table-wrap .community-table-title { padding: 1rem 1.1rem 0.65rem; color: #334155; letter-spacing: 0.04em; }
        .reports-table-wrap .table-overflow { min-height: 0; }
        .reports-table-wrap .reports-login-table { width: 100%; min-width: 0; table-layout: fixed; }
        .reports-table-wrap .data-table th { padding: 0.8rem 0.9rem; background: #f8fafc; color: #475569; }
        .reports-table-wrap .data-table td { padding: 0.8rem 0.9rem; overflow-wrap: anywhere; vertical-align: top; }
        .reports-login-user { min-width: 0; }
        .reports-login-user-email { overflow-wrap: anywhere; word-break: normal; }
        .reports-table-wrap .data-table th:last-child,
        .reports-table-wrap .data-table td:last-child { width: auto; min-width: 0; text-align: left; white-space: normal; }
        .reports-table-wrap .data-table tbody tr:nth-child(even) { background: #fbfdff; }
        .reports-table-wrap .data-table tbody tr:hover { background: #f1f5f9; }
        .reports-timestamp { display: grid; gap: 0.2rem; line-height: 1.3; white-space: nowrap; }
        .reports-timestamp span:first-child { color: #0f172a; font-weight: 600; }
        .reports-timestamp span:last-child { color: #64748b; font-size: 0.82rem; }
        .reports-view-switch { display: flex; gap: 0.5rem; }
        .reports-view-switch button { padding: 0.55rem 0.9rem; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #334155; cursor: pointer; }
        .reports-view-switch button.is-active { border-color: #2563eb; background: #eff6ff; color: #1d4ed8; font-weight: 600; }
        .reports-day-filter { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin: 0.5rem 0; padding: 0.75rem 1rem; border: 1px solid #bfdbfe; border-radius: 8px; background: #eff6ff; color: #1e3a8a; }
        .reports-day-filter button { border: 0; background: transparent; color: #1d4ed8; font: inherit; font-weight: 600; cursor: pointer; }
        @media (max-width: 720px) {
          .reports-table-wrap .reports-login-table { min-width: 680px; }
        }
        @media (max-width: 900px) {
          .reports-filter-grid--school, .reports-filter-grid--group, .reports-filter-grid--individual { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .reports-search { grid-column: 1 / -1; }
        }
        @media (max-width: 560px) {
          .reports-toolbar { padding: 0.8rem; }
          .reports-filter-grid--school, .reports-filter-grid--group, .reports-filter-grid--individual { grid-template-columns: minmax(0, 1fr); }
          .reports-search { grid-column: auto; }
          .reports-date-range { display: grid; grid-template-columns: minmax(0, 1fr); }
          .reports-date-range .reports-filter-field { width: auto; }
        }
        .report-chart-card {
          margin: 0.5rem 0 1rem;
          padding: 1.25rem 1.5rem 1.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.96));
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
        }
        .report-chart-card h2 {
          margin: 0 0 0.45rem;
          font-size: clamp(1.35rem, 1.8vw, 1.75rem);
          line-height: 1.1;
          letter-spacing: -0.04em;
          color: #0f172a;
        }
        .report-chart-description { margin: 0 0 0.75rem; color: #64748b; font-size: 0.88rem; line-height: 1.45; }
        .report-chart-summary { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.35rem 1rem; margin: 0 0 0.85rem; color: #64748b; font-size: 0.84rem; }
        .report-chart-summary strong { color: #1e293b; font-size: 1rem; }
        .report-chart-scroll {
          overflow-x: auto;
          padding: 0.25rem 0.25rem 0;
          border: 1px solid #edf2f7;
          border-radius: 14px;
          background: linear-gradient(180deg, rgba(248,250,252,0.8), rgba(255,255,255,0.8));
        }
        .report-activity-chart { display: block; width: 100%; min-width: 540px; height: clamp(280px, 28vw, 380px); }
        .report-activity-chart .report-chart-bar { outline: none; cursor: pointer; }
        .report-chart-bar__value { transition: fill 120ms ease; }
        .report-chart-bar:hover .report-chart-bar__value { fill: #1d4ed8; }
        .report-chart-bar:focus .report-chart-bar__value { fill: #1d4ed8; stroke: #0f172a; stroke-width: 2; }
      `}</style>
    </div>
  );
}
