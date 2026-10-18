import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useMothers } from '../../context/MothersContext';
import { PageSkeleton } from '../../components/LoadingSkeleton';
import { getSummary } from '../Community/communityService';
import { apiGetChildren } from '../../api/children';
import { apiGetPrograms } from '../../api/programs';
import { apiGetManagedHealthWorkers, apiGetUsers } from '../../api/users';
import { can, isCommunityCoordinatorRole, isHealthWorkerRole, normalizeRole, ROLES } from '../../utils/permissions';
import { DashboardInsights } from './DashboardInsights';

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
  const { mothers: contextMothers } = useMothers();
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loadErrors, setLoadErrors] = useState([]);

  useEffect(() => {
    let active = true;

    async function fetchDashboardData() {
      setRefreshing(true);
      const results = await Promise.allSettled([
        isSuperAdmin ? Promise.resolve(null) : getSummary(),
        isSuperAdmin ? Promise.resolve(null) : apiGetChildren(),
        isSuperAdmin ? Promise.resolve(null) : apiGetPrograms(),
        isSuperAdmin
          ? apiGetUsers(1, 100)
          : isCommunityOrganizer
            ? apiGetManagedHealthWorkers()
            : Promise.resolve(null),
      ]);

      if (!active) return;

      const [summaryResult, childrenResult, programsResult, usersResult] = results;
      const resultNames = ['community summary', 'children', 'programs', 'users'];
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
      setLastUpdated(new Date());
      setLoading(false);
      setRefreshing(false);
    }

    fetchDashboardData();
    return () => {
      active = false;
    };
  }, [isCommunityOrganizer, isSuperAdmin, refreshVersion]);

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

  const staffMetrics = useMemo(() => {
    const operationalRoles = new Set([
      ROLES.ADMIN,
      ROLES.PARTNER,
      ROLES.HEALTH_WORKER,
      ROLES.COMMUNITY_COORDINATOR,
    ]);
    const operationalUsers = users.filter((user) => operationalRoles.has(normalizeRole(user.role)));
    return {
      active: operationalUsers.filter((user) => String(user.status || 'Active').trim().toLowerCase() === 'active').length,
      unassigned: operationalUsers.filter((user) => (
        String(user.status || 'Active').trim().toLowerCase() === 'active' &&
        !(user.school_id ?? user.schoolId)
      )).length,
      suspended: operationalUsers.filter((user) => String(user.status || '').trim().toLowerCase() === 'suspended').length,
    };
  }, [users]);

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
  }), [isSuperAdmin, staffMetrics, stats]);

  const assignedSchoolName = useMemo(() => {
    const schoolId = currentUser?.school_id ?? currentUser?.schoolId;
    if (!schoolId) return null;
    const match = communitySummary.communities?.find((community) => String(community.id) === String(schoolId));
    return match?.name || `School #${schoolId}`;
  }, [communitySummary.communities, currentUser]);

  const assignedGroupName = useMemo(() => {
    const groupId = currentUser?.group_id ?? currentUser?.groupId;
    if (!groupId) return null;
    return communitySummary.groups?.find((group) => String(group.id) === String(groupId))?.name || `Group #${groupId}`;
  }, [communitySummary.groups, currentUser]);

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
        { key: 'receipts', title: 'Receipt Check-ins', value: stats.programCount, subtitle: 'Programs assigned to your group', to: '/program', icon: '🍱', cardClass: 'rose' },
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

  const actions = useMemo(() => {
    if (isSuperAdmin) {
      return [
        { label: 'Manage Users', to: '/user-management', icon: '👥' },
        { label: 'Login Reports', to: '/reports', icon: '📊' },
      ];
    }
    if (isHealthWorker) {
      return [
        { label: 'Record Receipt Check-ins', to: '/program', icon: '🍱' },
        ...(canRecordMonitoring ? [{ label: 'Record Checkup', to: '/monitoring', icon: '🩺' }] : []),
        { label: 'View Assigned Group', to: '/community', icon: '🏫' },
      ];
    }
    if (isCommunityOrganizer) {
      return [
        ...(canCreateBeneficiary ? [{ label: 'Register Beneficiary', to: '/beneficiary', icon: '👥' }] : []),
        ...(canRecordMonitoring ? [{ label: 'Record Checkup', to: '/monitoring', icon: '🩺' }] : []),
        ...(canManagePrograms ? [{ label: 'Manage Programs', to: '/program', icon: '🍱' }] : []),
        { label: 'Manage Health Workers', to: '/user-management', icon: '⚙️' },
      ];
    }
    if (isAdmin) {
      return [
        { label: 'Review Monitoring', to: '/monitoring', icon: '🩺' },
        { label: 'Review Programs', to: '/program', icon: '🍱' },
        { label: 'Progress Reports', to: '/progress-report', icon: '📊' },
      ];
    }
    return [
      { label: 'Review Programs', to: '/program', icon: '🍱' },
      { label: 'View Community', to: '/community', icon: '🏫' },
      { label: 'Progress Reports', to: '/progress-report', icon: '📊' },
    ];
  }, [canCreateBeneficiary, canManagePrograms, canRecordMonitoring, isAdmin, isCommunityOrganizer, isHealthWorker, isSuperAdmin]);

  if (loading) return <PageSkeleton variant="dashboard" />;

  const description = isSuperAdmin
    ? 'Manage operational accounts and review system access'
    : isHealthWorker
      ? 'Your assigned-group check-ins and follow-up tasks'
      : isCommunityOrganizer
        ? 'Manage beneficiaries, programs, and health workers for your school'
        : isAdmin
          ? 'Review operational progress across communities'
          : isPartner
            ? 'Review program and community activity'
            : `${roleLabel} workspace`;

  return (
    <div className="dashboard-shell">
      <header className="dashboard-top-row">
        <div className="dashboard-welcome">
          <div className="welcome-icon" aria-hidden="true">🌱</div>
          <div>
            <h2>
              {getGreeting(currentUser?.name)}
              <span className={`dashboard-user-badge${isSuperAdmin ? ' superadmin' : ''}`}>{roleLabel}</span>
              {assignedSchoolName && <span className="dashboard-school-pill">📍 {assignedSchoolName}</span>}
              {isHealthWorker && assignedGroupName && <span className="dashboard-group-pill">👥 {assignedGroupName}</span>}
            </h2>
            <p>{description}</p>
          </div>
        </div>
        <div className="dashboard-refresh-controls">
          {lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · refreshes every 5 min</span>}
          <button type="button" className="dashboard-refresh-button" onClick={() => setRefreshVersion((version) => version + 1)} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh dashboard'}
          </button>
        </div>
      </header>

      {loadErrors.length > 0 && (
        <p className="dashboard-load-warning" role="alert">
          Some dashboard data could not be refreshed ({loadErrors.join(', ')}). Displayed figures may be incomplete.
        </p>
      )}

      <section className="dashboard-kpi-grid" aria-label="Key role metrics">
        {cards.map((card) => (
          <Link key={card.key} to={card.to} className="kpi-card" aria-label={`${card.title}: ${card.value}. ${card.subtitle}`}>
            <div className="kpi-card-top">
              <span className="kpi-title">{card.title}</span>
              <span className={`kpi-icon ${card.cardClass}`} aria-hidden="true">{card.icon}</span>
            </div>
            <div className="kpi-value">{Number(card.value).toLocaleString()}</div>
            <div className="kpi-subtitle"><span>{card.subtitle}</span></div>
          </Link>
        ))}
      </section>

      <section className="dashboard-visual-grid" aria-label="Live dashboard reports">
        <div className="dashboard-panel dashboard-chart-panel">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-panel-eyebrow">Last 6 weeks</span><h3>New beneficiary registrations</h3></div>
            <Link to="/beneficiary" className="panel-link">View records</Link>
          </div>
          {registrationTrend.some((week) => week.count > 0) ? (
            <div className="dashboard-trend-chart" role="img" aria-label={`Weekly new registrations: ${registrationTrend.map((week) => `${week.label}: ${week.count}`).join(', ')}`}>
              {registrationTrend.map((week) => {
                const maximum = Math.max(1, ...registrationTrend.map((item) => item.count));
                return (
                  <div className="dashboard-trend-column" key={week.key}>
                    <strong>{week.count}</strong>
                    <span className="dashboard-trend-track"><span style={{ height: `${Math.max(week.count ? 8 : 0, (week.count / maximum) * 100)}%` }} /></span>
                    <small>{week.label}</small>
                  </div>
                );
              })}
            </div>
          ) : <p className="dashboard-empty-state">No dated registrations are available for the last 6 weeks.</p>}
        </div>

        <div className="dashboard-panel dashboard-chart-panel">
          <div className="dashboard-panel-heading">
            <div><span className="dashboard-panel-eyebrow">Current snapshot</span><h3>{isSuperAdmin ? 'Staff by account status' : 'Beneficiaries by type'}</h3></div>
          </div>
          <div className="dashboard-breakdown-list">
            {breakdown.map((item) => {
              const maximum = Math.max(1, ...breakdown.map((entry) => entry.value));
              return (
                <div className="dashboard-breakdown-row" key={item.label}>
                  <div><span>{item.label}</span><strong>{item.value.toLocaleString()}</strong></div>
                  <span className="dashboard-breakdown-track"><span className={item.tone} style={{ width: `${(item.value / maximum) * 100}%` }} /></span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="dashboard-follow-up-panel" aria-label="Actionable indicators">
        <div>
          <span className="dashboard-panel-eyebrow">Needs attention</span>
          <strong>{isSuperAdmin ? staffMetrics.unassigned : stats.followUpCount}</strong>
          <span>{isSuperAdmin ? 'active staff without a school assignment' : 'beneficiaries currently flagged for follow-up'}</span>
        </div>
        <Link to={isSuperAdmin ? '/user-management' : '/monitoring'} className="panel-link">
          {isSuperAdmin ? 'Review assignments' : 'Review monitoring'}
        </Link>
      </section>

      <DashboardInsights metrics={dashboardMetrics} ready={!loading} refreshVersion={refreshVersion} />

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

      <section className="dashboard-panel" aria-labelledby="dashboard-actions-title">
        <div className="panel-title-row">
          <div className="panel-title-wrap">
            <span className="panel-icon" aria-hidden="true">⚡</span>
            <h3 id="dashboard-actions-title">Your shortcuts</h3>
          </div>
        </div>
        <div className="quick-action-grid">
          {actions.map((action) => (
            <Link key={action.label} to={action.to} className="quick-action-tile">
              <div className="quick-action-tile-icon" aria-hidden="true">{action.icon}</div>
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
