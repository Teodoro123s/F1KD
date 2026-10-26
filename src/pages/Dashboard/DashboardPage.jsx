import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useMothers } from '../../context/MothersContext';
import { PageSkeleton } from '../../components/LoadingSkeleton';
import { getSummary } from '../Community/communityService';
import { apiGetChildren } from '../../api/children';
import { apiGetPrograms } from '../../api/programs';
import { apiGetManagedHealthWorkers, apiGetUsers } from '../../api/users';
import { apiGetActivityReport, apiGetReportScopes } from '../../api/reports';
import { apiGetNotifications } from '../../api/notifications';
import { can, isCommunityCoordinatorRole, isHealthWorkerRole, normalizeRole, ROLES } from '../../utils/permissions';
import { DashboardInsights } from './DashboardInsights';
import { buildDashboardModuleSummaries, buildOperationalStaffMetrics } from './dashboardModuleMetrics.mjs';
import { fillDailyTimeSeries, getRollingDateRange } from '../../utils/analytics/dailyTimeSeries';

function getGreeting(name) {
  const hour = new Date().getHours();
  let timeStr = 'Good morning';
  if (hour >= 12 && hour < 17) timeStr = 'Good afternoon';
  else if (hour >= 17) timeStr = 'Good evening';

  const firstName = (name || '').trim().split(' ')[0] || 'User';
  return `${timeStr}, ${firstName}!`;
}

function getList(result, key) {
  if (Array.isArray(result?.[key])) return result[key];
  return Array.isArray(result) ? result : [];
}

async function fetchAllDashboardUsers() {
  const firstPage = await apiGetUsers(1, 100);
  const users = getList(firstPage, 'users');
  const total = Number(firstPage?.total) || users.length;
  const pageCount = Math.ceil(total / 100);
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => apiGetUsers(index + 2, 100)),
  );

  return { users: [...users, ...remainingPages.flatMap((page) => getList(page, 'users'))] };
}

function getRecordName(record) {
  return record.name
    || [record.firstName || record.first_name, record.middleName || record.middle_name, record.lastName || record.last_name, record.suffix]
      .filter(Boolean)
      .join(' ')
    || 'Unnamed record';
}

function getRecordDate(record) {
  const value = record.createdAt || record.created_at || record.raw?.created_at || record.updatedAt || record.updated_at;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildRegistrationTrend(records) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const dayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayOffset - (5 * 7));
  const weeks = Array.from({ length: 6 }, (_, index) => {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + index * 7);
    const key = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
    return {
      key,
      label: weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: 0,
    };
  });
  const weekStarts = weeks.map((week) => new Date(`${week.key}T00:00:00`));
  records.forEach((record) => {
    const date = getRecordDate(record);
    if (!date) return;
    date.setHours(0, 0, 0, 0);
    const index = Math.floor((date.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (index >= 0 && index < weeks.length && date >= weekStarts[index]) weeks[index].count += 1;
  });
  return weeks;
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { mothers: contextMothers, refreshMothers, error: mothersError } = useMothers();
  const normalizedRole = normalizeRole(currentUser?.role);
  const isSuperAdmin = normalizedRole === ROLES.SUPER_ADMIN;
  const isAdmin = normalizedRole === ROLES.ADMIN;
  const isHealthWorker = isHealthWorkerRole(currentUser?.role);
  const isPartner = normalizedRole === ROLES.PARTNER;
  const isCommunityOrganizer = isCommunityCoordinatorRole(currentUser?.role);
  const canCreateBeneficiary = can(currentUser?.role, 'beneficiary-resources', 'create');
  const canManagePrograms = can(currentUser?.role, 'program-resources', 'update');
  const canRecordMonitoring = can(currentUser?.role, 'monitor-resources', 'create');

  const [communitySummary, setCommunitySummary] = useState({ communities: [], batches: [], groups: [], mothers: [] });
  const [children, setChildren] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [users, setUsers] = useState([]);
  const [reportScopes, setReportScopes] = useState({ schools: [], groups: [] });
  const [activityReport, setActivityReport] = useState({ activities: [], counts: { signIns: 0 }, dailyActivity: [] });
  const [notificationCounts, setNotificationCounts] = useState({ all: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loadErrors, setLoadErrors] = useState([]);
  const activityDateRange = useMemo(() => getRollingDateRange(30), [refreshVersion]);

  useEffect(() => {
    let active = true;

    async function fetchDashboardData() {
      const results = await Promise.allSettled([
        isSuperAdmin ? Promise.resolve(null) : getSummary(),
        isSuperAdmin ? Promise.resolve(null) : refreshMothers(),
        isSuperAdmin ? Promise.resolve(null) : apiGetChildren(),
        isSuperAdmin ? Promise.resolve(null) : apiGetPrograms(),
        isSuperAdmin
          ? fetchAllDashboardUsers()
          : isCommunityOrganizer
            ? apiGetManagedHealthWorkers()
            : Promise.resolve(null),
        isSuperAdmin ? apiGetReportScopes() : Promise.resolve(null),
        isSuperAdmin ? apiGetActivityReport({
          page: 1,
          perPage: 8,
          chartFrom: activityDateRange.from,
          chartTo: activityDateRange.to,
        }) : Promise.resolve(null),
        isSuperAdmin ? apiGetNotifications({ page: 1, perPage: 1 }) : Promise.resolve(null),
      ]);

      if (!active) return;

      const [
        summaryResult,
        ,
        childrenResult,
        programsResult,
        usersResult,
        reportScopesResult,
        activityReportResult,
        notificationsResult,
      ] = results;
      const resultNames = [
        'community summary',
        'beneficiary records',
        'children',
        'programs',
        'users',
        'community scopes',
        'activity report',
        'notifications',
      ];
      const errors = [];
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`[DashboardPage] Failed to load ${resultNames[index]}:`, result.reason);
          errors.push(resultNames[index]);
        }
      });
      setLoadErrors(errors);

      if (summaryResult.status === 'fulfilled' && summaryResult.value) {
        setCommunitySummary(summaryResult.value);
      }
      if (childrenResult.status === 'fulfilled' && childrenResult.value) {
        setChildren(getList(childrenResult.value, 'children'));
      }
      if (programsResult.status === 'fulfilled' && programsResult.value) {
        setPrograms(getList(programsResult.value, 'programs'));
      }
      if (usersResult.status === 'fulfilled' && usersResult.value) {
        setUsers(getList(usersResult.value, 'users'));
      }
      if (reportScopesResult.status === 'fulfilled' && reportScopesResult.value) {
        setReportScopes(reportScopesResult.value);
      }
      if (activityReportResult.status === 'fulfilled' && activityReportResult.value) {
        setActivityReport(activityReportResult.value);
      }
      if (notificationsResult.status === 'fulfilled' && notificationsResult.value) {
        setNotificationCounts(notificationsResult.value.counts || { all: 0, unread: 0 });
      }
      setLoading(false);
    }

    fetchDashboardData();
    return () => {
      active = false;
    };
  }, [activityDateRange.from, activityDateRange.to, isCommunityOrganizer, isSuperAdmin, refreshMothers, refreshVersion]);

  useEffect(() => {
    const timer = window.setInterval(() => setRefreshVersion((version) => version + 1), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const mothers = useMemo(() => {
    if (Array.isArray(contextMothers) && contextMothers.length > 0) return contextMothers;
    return Array.isArray(communitySummary.mothers) ? communitySummary.mothers : [];
  }, [contextMothers, communitySummary.mothers]);

  const stats = useMemo(() => {
    let followUpCount = 0;
    mothers.forEach((mother) => {
      const progress = Number(mother.progress) || 0;
      if (progress > 0 && progress < 60) followUpCount++;
    });
    children.forEach((child) => {
      const progress = Number(child.progress) || 0;
      if (progress > 0 && progress < 24) followUpCount++;
    });
    return {
      motherCount: mothers.length,
      childCount: children.length,
      followUpCount,
      communityCount: communitySummary.communities?.length || 0,
      batchCount: communitySummary.batches?.length || 0,
      groupCount: communitySummary.groups?.length || 0,
      programCount: programs.length,
    };
  }, [children, communitySummary, mothers, programs]);

  const staffMetrics = useMemo(() => buildOperationalStaffMetrics(users), [users]);

  const registrationTrend = useMemo(
    () => buildRegistrationTrend([...mothers, ...children]),
    [children, mothers],
  );

  const recentRecords = useMemo(() => [...mothers, ...children]
    .map((record, index) => ({
      name: getRecordName(record),
      type: record.birthDate || record.birth_date ? 'Child' : 'Mother',
      date: getRecordDate(record),
      id: record.id || record.child_code || `${record.name || 'record'}-${index}`,
    }))
    .filter((record) => record.date)
    .sort((left, right) => right.date - left.date)
    .slice(0, 8), [children, mothers]);

  const breakdown = isSuperAdmin
    ? [
      { label: 'Active staff', value: staffMetrics.active, tone: 'teal' },
      { label: 'Suspended staff', value: staffMetrics.suspended, tone: 'rose' },
    ]
    : [
      { label: 'Mothers', value: stats.motherCount, tone: 'rose' },
      { label: 'Children', value: stats.childCount, tone: 'teal' },
    ];

  const dashboardMetrics = useMemo(() => ({
    motherCount: isSuperAdmin ? 0 : stats.motherCount,
    childCount: isSuperAdmin ? 0 : stats.childCount,
    beneficiaryCount: isSuperAdmin ? 0 : stats.motherCount + stats.childCount,
    followUpCount: isSuperAdmin ? 0 : stats.followUpCount,
    communityCount: isSuperAdmin ? 0 : stats.communityCount,
    groupCount: isSuperAdmin ? 0 : stats.groupCount,
    batchCount: isSuperAdmin ? 0 : stats.batchCount,
    programCount: isSuperAdmin ? 0 : stats.programCount,
    activeStaff: staffMetrics.active,
    unassignedStaff: staffMetrics.unassigned,
    suspendedStaff: staffMetrics.suspended,
    operationalAccounts: isSuperAdmin ? staffMetrics.total : 0,
    communitySchools: isSuperAdmin ? reportScopes.schools?.length || 0 : 0,
    communityGroups: isSuperAdmin ? reportScopes.groups?.length || 0 : 0,
    operationalSignInsLast30Days: isSuperAdmin
      ? (activityReport.dailyActivity || []).reduce((total, item) => total + (Number(item.count) || 0), 0)
      : 0,
    unreadNotifications: isSuperAdmin ? Number(notificationCounts.unread) || 0 : 0,
    dataQuality: {
      incompleteSources: [...new Set([...loadErrors, ...(mothersError ? ['beneficiary records'] : [])])],
      complete: loadErrors.length === 0 && !mothersError,
    },
  }), [activityReport, isSuperAdmin, loadErrors, mothersError, notificationCounts, reportScopes, staffMetrics, stats]);

  const moduleSummaries = useMemo(() => buildDashboardModuleSummaries({
    mothers,
    children,
    programs,
    staffMetrics,
    communityMetrics: {
      schools: reportScopes.schools?.length || 0,
      groups: reportScopes.groups?.length || 0,
    },
    reportMetrics: {
      signIns: Number(activityReport.counts?.signIns) || 0,
      signInsLast30Days: (activityReport.dailyActivity || []).reduce(
        (total, item) => total + (Number(item.count) || 0),
        0,
      ),
    },
    notificationMetrics: notificationCounts,
    isSuperAdmin,
    isCommunityOrganizer,
  }), [
    activityReport,
    children,
    isCommunityOrganizer,
    isSuperAdmin,
    mothers,
    notificationCounts,
    programs,
    reportScopes,
    staffMetrics,
  ]);

  const signInTrend = useMemo(
    () => fillDailyTimeSeries(activityReport.dailyActivity || [], activityDateRange.from, activityDateRange.to).map((item) => ({
      ...item,
      key: item.date,
      label: new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    })),
    [activityDateRange.from, activityDateRange.to, activityReport.dailyActivity],
  );

  const roleLabel = isSuperAdmin
    ? 'Superadmin'
    : isAdmin
      ? 'Administrator'
      : isHealthWorker
        ? 'Health Worker'
        : isCommunityOrganizer
          ? 'Community Coordinator'
          : isPartner
            ? 'Community Partner'
            : 'Staff';

  const cards = useMemo(() => {
    if (isSuperAdmin) {
      return [
        { key: 'active-staff', title: 'Active Staff', value: staffMetrics.active, subtitle: 'Operational accounts', to: '/user-management', icon: '👥', cardClass: 'teal' },
        { key: 'unassigned-staff', title: 'Unassigned Staff', value: staffMetrics.unassigned, subtitle: 'Need a school assignment', to: '/user-management', icon: '📍', cardClass: 'amber' },
        { key: 'suspended-staff', title: 'Suspended Staff', value: staffMetrics.suspended, subtitle: 'Accounts requiring review', to: '/user-management', icon: '⚠️', cardClass: 'slate' },
      ];
    }

    if (isHealthWorker) {
      return [
        { key: 'follow-ups', title: 'Follow-Ups', value: stats.followUpCount, subtitle: 'Beneficiaries needing follow-up', to: '/monitoring', icon: '🩺', cardClass: 'amber' },
        { key: 'receipts', title: 'Assigned Programs', value: stats.programCount, subtitle: 'Available to your group', to: '/program', icon: '🍱', cardClass: 'rose' },
      ];
    }

    const allRoleCards = [
      { key: 'beneficiaries', title: 'Beneficiaries', value: stats.motherCount + stats.childCount, subtitle: `${stats.motherCount} mothers · ${stats.childCount} children`, to: '/beneficiary', icon: '👥', cardClass: 'teal' },
      { key: 'follow-ups', title: 'Follow-Ups', value: stats.followUpCount, subtitle: 'Beneficiaries needing follow-up', to: '/monitoring', icon: '🩺', cardClass: 'amber' },
      { key: 'communities', title: 'Communities', value: stats.communityCount, subtitle: `${stats.batchCount} batches · ${stats.groupCount} groups`, to: '/community', icon: '🏫', cardClass: 'indigo' },
      { key: 'programs', title: 'Programs', value: stats.programCount, subtitle: 'Intervention programs', to: '/program', icon: '🍱', cardClass: 'rose' },
      ...(isCommunityOrganizer ? [{
        key: 'health-workers',
        title: 'Health Workers',
        value: staffMetrics.active,
        subtitle: 'Active in your assigned school',
        to: '/user-management',
        icon: '⚙️',
        cardClass: 'slate',
      }] : []),
    ];

    if (isCommunityOrganizer) return allRoleCards;
    if (isAdmin) return allRoleCards.filter((card) => card.key !== 'health-workers');
    return allRoleCards.filter((card) => ['communities', 'programs'].includes(card.key));
  }, [isAdmin, isCommunityOrganizer, isHealthWorker, isSuperAdmin, staffMetrics, stats]);

  const displayCards = cards.map((card) => {
    const sourceByCard = isSuperAdmin
      ? { 'active-staff': 'users', 'unassigned-staff': 'users', 'suspended-staff': 'users' }
      : {
        beneficiaries: mothersError || loadErrors.includes('children') ? true : false,
        'follow-ups': mothersError || loadErrors.includes('children') ? true : false,
        communities: loadErrors.includes('community summary'),
        programs: loadErrors.includes('programs'),
        'health-workers': loadErrors.includes('users'),
      };
    const unavailable = sourceByCard[card.key];
    const failed = unavailable === true || (typeof unavailable === 'string' && loadErrors.includes(unavailable));
    return failed ? { ...card, value: '—', subtitle: 'Could not refresh; figure unavailable' } : card;
  });

  if (loading) return <PageSkeleton variant="dashboard" />;

  const description = isSuperAdmin
    ? 'Live overview of Community, User Management, Reports, and Notifications'
    : isHealthWorker
      ? 'Your assigned-group check-ins and follow-up tasks'
      : isCommunityOrganizer
        ? 'Manage beneficiaries, programs, and health workers for your school'
        : isAdmin
          ? 'Review operational progress across communities'
          : isPartner
            ? 'Review program and community activity'
            : `${roleLabel} workspace`;

  const trendPeriods = isSuperAdmin ? signInTrend : registrationTrend;
  const trendMaximum = Math.max(1, ...trendPeriods.map((period) => period.count));
  const breakdownMaximum = Math.max(1, ...breakdown.map((item) => item.value));
  const breakdownTotal = breakdown.reduce((total, item) => total + item.value, 0);
  const signInTotal = signInTrend.reduce((total, period) => total + period.count, 0);
  const peakSignInDay = signInTrend.reduce((peak, period) => period.count > peak.count ? period : peak, { count: 0, label: '' });

  return (
    <div className="dashboard-shell">
      <header className="dashboard-top-row">
        <div className="dashboard-welcome">
          <div>
            <h2>
              {getGreeting(currentUser?.name)}
            </h2>
            <p>{description}</p>
          </div>
        </div>
      </header>

      {(loadErrors.length > 0 || mothersError) && (
        <p className="dashboard-load-warning" role="alert">
          Some dashboard data could not be refreshed ({[...new Set([...loadErrors, ...(mothersError ? ['beneficiary records'] : [])])].join(', ')}). Displayed figures may be incomplete.
        </p>
      )}

      <section className="dashboard-kpi-grid" aria-label="Key role metrics">
        {displayCards.map((card) => (
          <Link key={card.key} to={card.to} className="kpi-card" aria-label={`${card.title}: ${card.value}. ${card.subtitle}`}>
            <div className="kpi-card-top">
              <span className="kpi-title">{card.title}</span>
              <span className={`kpi-icon ${card.cardClass}`} aria-hidden="true">{card.icon}</span>
            </div>
            <div className="kpi-value">{typeof card.value === 'number' && Number.isFinite(card.value) ? card.value.toLocaleString() : card.value}</div>
            <div className="kpi-subtitle"><span>{card.subtitle}</span></div>
          </Link>
        ))}
      </section>

      <section className="dashboard-visual-grid" aria-label="Live dashboard reports">
        <div className="dashboard-panel dashboard-chart-panel">
          <div className="dashboard-panel-heading">
            <div>
              <span className="dashboard-panel-eyebrow">{isSuperAdmin ? 'Last 30 days' : 'Last 6 weeks'}</span>
              <h3>{isSuperAdmin ? 'Operational sign-ins' : 'New beneficiary registrations'}</h3>
              {isSuperAdmin && <p className="dashboard-trend-summary">{signInTotal.toLocaleString()} sign-ins · Peak {peakSignInDay.count.toLocaleString()} on {peakSignInDay.label || '—'}</p>}
            </div>
            {!isSuperAdmin && <Link to="/beneficiary" className="panel-link">View records</Link>}
          </div>
          {(isSuperAdmin ? signInTrend : registrationTrend).some((period) => period.count > 0) ? (
            <div className={`dashboard-trend-scroll${isSuperAdmin ? ' is-daily' : ''}`}>
              <div
                className={`dashboard-trend-chart${isSuperAdmin ? ' is-daily' : ''}`}
                role="img"
                aria-label={`${isSuperAdmin ? 'Daily operational sign-ins' : 'Weekly new registrations'}: ${trendPeriods.map((period) => `${period.label}: ${period.count}`).join(', ')}`}
              >
              {trendPeriods.map((period, index) => {
                const showLabel = !isSuperAdmin || index === 0 || index === trendPeriods.length - 1 || index % 5 === 4;
                return (
                  <div className={`dashboard-trend-column${isSuperAdmin ? ' is-daily' : ''}`} key={period.key} title={`${period.label}: ${period.count} ${isSuperAdmin ? 'sign-ins' : 'registrations'}`}>
                    {!isSuperAdmin && <strong>{period.count}</strong>}
                    <span className="dashboard-trend-track"><span style={{ height: `${Math.max(period.count ? 8 : 0, (period.count / trendMaximum) * 100)}%` }} /></span>
                    <small>{showLabel ? period.label : ''}</small>
                  </div>
                );
              })}
              </div>
            </div>
          ) : <p className="dashboard-empty-state">
            {isSuperAdmin
              ? 'No operational sign-ins are available for the last 30 days.'
              : 'No dated registrations are available for the last 6 weeks.'}
          </p>}
        </div>

        <div className="dashboard-panel dashboard-chart-panel">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-panel-eyebrow">Current snapshot</span><h3>{isSuperAdmin ? 'Staff by account status' : 'Beneficiaries by type'}</h3></div>
          </div>
          <div className="dashboard-breakdown-list">
            {breakdown.map((item) => {
              const percent = isSuperAdmin
                ? (item.value / Math.max(1, breakdownTotal)) * 100
                : (item.value / breakdownMaximum) * 100;
              return (
                <div className="dashboard-breakdown-row" key={item.label}>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value.toLocaleString()}{isSuperAdmin && <small> · {Math.round(percent)}%</small>}</strong>
                  </div>
                  <span className="dashboard-breakdown-track"><span className={item.tone} style={{ width: `${percent}%` }} /></span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="dashboard-module-summary-grid" aria-label="Live module summaries">
        {moduleSummaries.map((module) => (
          <article className="dashboard-panel dashboard-module-summary" key={module.key}>
            <div className="dashboard-panel-heading">
              <div><span className="dashboard-panel-eyebrow">Live data</span><h3>{module.title}</h3></div>
              <Link to={module.to} className="panel-link">Open module</Link>
            </div>
            <dl className="dashboard-module-metrics">
              {module.metrics.map((metric) => (
                <div className="dashboard-module-metric" key={metric.label}>
                  <dt>{metric.label}</dt>
                  <dd>{typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}</dd>
                </div>
              ))}
            </dl>
            <p className="dashboard-module-note">{module.note}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-follow-up-panel" aria-label="Actionable indicators">
        <div>
          <span className="dashboard-panel-eyebrow">Needs attention</span>
          <strong>{isSuperAdmin ? staffMetrics.unassigned : stats.followUpCount}</strong>
          <span>          {isSuperAdmin ? 'active staff missing a required school or group assignment' : 'beneficiaries currently flagged for follow-up'}</span>
        </div>
        <Link to={isSuperAdmin ? '/user-management' : '/monitoring'} className="panel-link">
          {isSuperAdmin ? 'Review assignments' : 'Review monitoring'}
        </Link>
      </section>

      <DashboardInsights metrics={dashboardMetrics} ready={!loading} refreshVersion={refreshVersion} />

      {isSuperAdmin ? (
        <section className="dashboard-panel dashboard-recent-panel" aria-labelledby="dashboard-recent-title">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-panel-eyebrow">Latest report entries</span><h3 id="dashboard-recent-title">Recent operational sign-ins</h3></div>
            <Link to="/reports" className="panel-link">Open reports</Link>
          </div>
          {activityReport.activities?.length ? (
            <div className="dashboard-recent-table-wrap">
              <table className="dashboard-recent-table">
                <thead><tr><th scope="col">User</th><th scope="col">Action</th><th scope="col">Recorded</th></tr></thead>
                <tbody>
                  {activityReport.activities.map((activity) => {
                    const date = new Date(activity.createdAt);
                    return (
                      <tr key={activity.id}>
                        <td>{activity.actorName || 'Unknown user'}</td>
                        <td>Signed in</td>
                        <td>{Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="dashboard-empty-state">No operational activity is available in the report.</p>}
        </section>
      ) : (
        <section className="dashboard-panel dashboard-recent-panel" aria-labelledby="dashboard-recent-title">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-panel-eyebrow">Latest records</span><h3 id="dashboard-recent-title">Recent registrations</h3></div>
            <Link to="/beneficiary" className="panel-link">Open beneficiaries</Link>
          </div>
          {recentRecords.length ? (
            <div className="dashboard-recent-table-wrap">
              <table className="dashboard-recent-table">
                <thead><tr><th scope="col">Record</th><th scope="col">Type</th><th scope="col">Registered</th></tr></thead>
                <tbody>
                  {recentRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{record.name}</td>
                      <td>{record.type}</td>
                      <td>{record.date.toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="dashboard-empty-state">No recent registration dates are available.</p>}
        </section>
      )}

    </div>
  );
}
