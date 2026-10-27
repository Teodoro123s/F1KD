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
import { getRollingDateRange } from '../../utils/analytics/dailyTimeSeries';

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
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const activityDateRange = useMemo(() => getRollingDateRange(30), [refreshVersion]);

  useEffect(() => {
    let active = true;

    async function fetchDashboardData() {
      const results = await Promise.allSettled([
        isSuperAdmin ? Promise.resolve(null) : getSummary(),
        isSuperAdmin ? Promise.resolve(null) : refreshMothers(['checkups']),
        isSuperAdmin ? Promise.resolve(null) : apiGetChildren(['checkups']),
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
    batches: communitySummary.batches || [],
    selectedBatchId,
    programs,
    programsAvailable: !loadErrors.includes('programs'),
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
    communitySummary.batches,
    isCommunityOrganizer,
    isSuperAdmin,
    loadErrors,
    mothers,
    notificationCounts,
    programs,
    reportScopes,
    selectedBatchId,
    staffMetrics,
  ]);

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
        { key: 'active-staff', title: 'Active Staff', value: staffMetrics.active, subtitle: 'Operational accounts', to: '/user-management' },
        { key: 'unassigned-staff', title: 'Unassigned Staff', value: staffMetrics.unassigned, subtitle: 'Need a school assignment', to: '/user-management' },
        { key: 'suspended-staff', title: 'Suspended Staff', value: staffMetrics.suspended, subtitle: 'Accounts requiring review', to: '/user-management' },
      ];
    }

    if (isCommunityOrganizer) return [];

    if (isHealthWorker) {
      return [
        { key: 'follow-ups', title: 'Follow-Ups', value: stats.followUpCount, subtitle: 'Beneficiaries needing follow-up', to: '/monitoring' },
        { key: 'receipts', title: 'Assigned Projects', value: stats.programCount, subtitle: 'Available to your group', to: '/program' },
      ];
    }

    const allRoleCards = [
      { key: 'beneficiaries', title: 'Beneficiaries', value: stats.motherCount + stats.childCount, subtitle: `${stats.motherCount} mothers · ${stats.childCount} children`, to: '/beneficiary' },
      { key: 'follow-ups', title: 'Follow-Ups', value: stats.followUpCount, subtitle: 'Beneficiaries needing follow-up', to: '/monitoring' },
      { key: 'communities', title: 'Communities', value: stats.communityCount, subtitle: `${stats.batchCount} batches · ${stats.groupCount} groups`, to: '/community' },
      { key: 'programs', title: 'Projects', value: stats.programCount, subtitle: 'Intervention projects', to: '/program' },
    ];

    if (isCommunityOrganizer) {
      return [
        ...allRoleCards,
        { key: 'health-workers', title: 'Health Workers', value: staffMetrics.active, subtitle: 'Active in your assigned school', to: '/user-management' },
      ];
    }
    if (isAdmin) return allRoleCards;
    if (isPartner) return allRoleCards.filter((card) => ['communities', 'programs'].includes(card.key));
    return [];
  }, [isAdmin, isCommunityOrganizer, isHealthWorker, isPartner, isSuperAdmin, staffMetrics, stats]);

  const displayCards = cards.map((card) => {
    const sourceByCard = isSuperAdmin
      ? { 'active-staff': 'users', 'unassigned-staff': 'users', 'suspended-staff': 'users' }
      : {
        'follow-ups': mothersError || loadErrors.includes('children') ? true : false,
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
        ? 'Manage beneficiaries, projects, and health workers for your school'
        : isAdmin
          ? 'Review operational progress across communities'
          : isPartner
            ? 'Review project and community activity'
            : `${roleLabel} workspace`;

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

      {displayCards.length > 0 && (
        <section className="dashboard-kpi-grid" aria-label="Key role metrics">
          {displayCards.map((card) => (
            <Link key={card.key} to={card.to} className="kpi-card" aria-label={`${card.title}: ${card.value}. ${card.subtitle}`}>
              <div className="kpi-card-top">
                <span className="kpi-title">{card.title}</span>
              </div>
              <div className="kpi-value">{typeof card.value === 'number' && Number.isFinite(card.value) ? card.value.toLocaleString() : card.value}</div>
              <div className="kpi-subtitle"><span>{card.subtitle}</span></div>
            </Link>
          ))}
        </section>
      )}

      <section className="dashboard-module-summary-grid" aria-label="Live module summaries">
        {moduleSummaries.map((module) => (
          <article
            className={`dashboard-panel dashboard-module-summary${module.key === 'monitoring' ? ' dashboard-module-summary-monitoring' : ''}`}
            key={module.key}
          >
            <div className="dashboard-panel-heading">
              <div><span className="dashboard-panel-eyebrow">Live data</span><h3>{module.title}</h3></div>
              <Link to={module.to} className="panel-link">Open module</Link>
            </div>
            {module.key === 'batch-progress' && module.batchOptions.length > 1 && (
              <label className="dashboard-batch-filter">
                <span>Batch</span>
                <select
                  aria-label="Filter batch progress"
                  value={module.selectedBatchId}
                  onChange={(event) => setSelectedBatchId(event.target.value)}
                >
                  {module.batchOptions.map((batch) => (
                    <option key={batch.id} value={batch.id}>{batch.name}</option>
                  ))}
                </select>
              </label>
            )}
            <dl className="dashboard-module-metrics">
              {module.metrics.map((metric) => (
                <div className="dashboard-module-metric" key={metric.label}>
                  <dt>
                    {metric.to
                      ? <Link to={metric.to} className="dashboard-module-metric-link">{metric.label}</Link>
                      : metric.label}
                  </dt>
                  <dd>
                    {metric.to
                      ? <Link to={metric.to} className="dashboard-module-metric-link dashboard-module-metric-value">{typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}</Link>
                      : typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="dashboard-module-note">{module.note}</p>
          </article>
        ))}
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
