import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Users,
  UserPlus,
  UserCheck,
  Baby,
  AlertCircle,
  Building2,
  FolderKanban,
  ClipboardList,
  ShieldCheck,
  Activity,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
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
import {
  buildDashboardModuleSummaries,
  buildOperationalStaffMetrics,
  getIncompleteBatchProgressOptions,
} from './dashboardModuleMetrics.mjs';
import {
  getRollingDateRange,
  toLocalDateKey,
  fillDailyTimeSeries,
} from '../../utils/analytics/dailyTimeSeries';
import AIReportingAssistantEntry from '../AISetting/AIReportingAssistantEntry';

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

/* Custom Chart Tooltip */
function ChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="dashboard-chart-tooltip">
        {label && <div className="tooltip-label">{label}</div>}
        {payload.map((entry, index) => (
          <div key={`tip-${index}`} className="tooltip-item">
            <span
              className="tooltip-dot"
              style={{ backgroundColor: entry.color || entry.fill || '#15803d' }}
            />
            <span className="tooltip-name">{entry.name || 'Count'}:</span>
            <span className="tooltip-val">{Number(entry.value).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
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
        {
          key: 'active-staff',
          title: 'Active Staff',
          value: staffMetrics.active,
          badge: 'Operational',
          badgeType: 'positive',
          subtitle: 'Operational accounts',
          to: '/user-management',
          icon: 'users',
        },
        {
          key: 'unassigned-staff',
          title: 'Unassigned Staff',
          value: staffMetrics.unassigned,
          badge: staffMetrics.unassigned > 0 ? 'Needs Assignment' : 'All Assigned',
          badgeType: staffMetrics.unassigned > 0 ? 'warning' : 'positive',
          subtitle: 'Need a school assignment',
          to: '/user-management',
          icon: 'clipboard',
        },
        {
          key: 'suspended-staff',
          title: 'Suspended Staff',
          value: staffMetrics.suspended,
          badge: 'Review',
          badgeType: staffMetrics.suspended > 0 ? 'negative' : 'neutral',
          subtitle: 'Accounts requiring review',
          to: '/user-management',
          icon: 'alert',
        },
        {
          key: 'total-accounts',
          title: 'Total Accounts',
          value: staffMetrics.total,
          badge: 'System Scope',
          badgeType: 'neutral',
          subtitle: 'Operational staff in system',
          to: '/user-management',
          icon: 'building',
        },
      ];
    }

    if (isHealthWorker) {
      return [
        {
          key: 'follow-ups',
          title: 'Follow-Ups',
          value: stats.followUpCount,
          badge: stats.followUpCount > 0 ? 'Action Needed' : 'On Track',
          badgeType: stats.followUpCount > 0 ? 'warning' : 'positive',
          subtitle: 'Beneficiaries needing follow-up',
          to: '/monitoring',
          icon: 'alert',
        },
        {
          key: 'receipts',
          title: 'Assigned Projects',
          value: stats.programCount,
          badge: 'Active Focus',
          badgeType: 'positive',
          subtitle: 'Available to your group',
          to: '/program',
          icon: 'projects',
        },
        {
          key: 'group-mothers',
          title: 'Assigned Mothers',
          value: stats.motherCount,
          badge: 'Registered',
          badgeType: 'neutral',
          subtitle: 'Mothers in your group',
          to: '/beneficiary',
          icon: 'mothers',
        },
        {
          key: 'group-children',
          title: 'Assigned Children',
          value: stats.childCount,
          badge: 'Monitored',
          badgeType: 'positive',
          subtitle: 'Children in your group',
          to: '/beneficiary',
          icon: 'children',
        },
      ];
    }

    const allRoleCards = [
      {
        key: 'beneficiaries',
        title: 'Total Beneficiaries',
        value: stats.motherCount + stats.childCount,
        badge: `${stats.motherCount}M · ${stats.childCount}C`,
        badgeType: 'positive',
        subtitle: `${stats.motherCount} mothers · ${stats.childCount} children`,
        to: '/beneficiary',
        icon: 'users',
      },
      {
        key: 'follow-ups',
        title: 'Follow-Ups',
        value: stats.followUpCount,
        badge: stats.followUpCount > 0 ? 'Action Required' : 'On Track',
        badgeType: stats.followUpCount > 0 ? 'warning' : 'positive',
        subtitle: 'Beneficiaries needing check-up',
        to: '/monitoring',
        icon: 'alert',
      },
      {
        key: 'communities',
        title: 'Communities',
        value: stats.communityCount,
        badge: `${stats.batchCount} Batches`,
        badgeType: 'neutral',
        subtitle: `${stats.batchCount} batches · ${stats.groupCount} groups`,
        to: '/community',
        icon: 'building',
      },
      {
        key: 'programs',
        title: 'Projects',
        value: stats.programCount,
        badge: 'Interventions',
        badgeType: 'positive',
        subtitle: 'Intervention projects',
        to: '/program',
        icon: 'projects',
      },
    ];

    if (isCommunityOrganizer) {
      return [
        allRoleCards[0],
        allRoleCards[1],
        {
          key: 'health-workers',
          title: 'Health Workers',
          value: staffMetrics.active,
          badge: 'School Staff',
          badgeType: 'positive',
          subtitle: 'Active in your assigned school',
          to: '/user-management',
          icon: 'health-workers',
        },
        allRoleCards[3],
      ];
    }

    if (isAdmin || isPartner) return allRoleCards;
    return allRoleCards;
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

  /* --------------------------------------------------------------------------
     Visualizations Data (Recharts)
     -------------------------------------------------------------------------- */

  // 1. Trend Timeline AreaChart Data (Last 30 Days)
  const timelineData = useMemo(() => {
    if (isSuperAdmin) {
      const filled = fillDailyTimeSeries(activityReport.dailyActivity || [], activityDateRange.from, activityDateRange.to);
      return filled.map((item) => {
        const d = new Date(item.date);
        return {
          date: item.date,
          displayDate: Number.isNaN(d.getTime())
            ? item.date
            : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: item.count,
        };
      });
    }

    // Operational roles: Beneficiary registration timeline
    const countsByDate = new Map();
    [...mothers, ...children].forEach((record) => {
      const date = getRecordDate(record);
      if (!date) return;
      const key = toLocalDateKey(date);
      countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
    });
    const rawRows = Array.from(countsByDate.entries()).map(([date, count]) => ({ date, count }));
    const filled = fillDailyTimeSeries(rawRows, activityDateRange.from, activityDateRange.to);
    return filled.map((item) => {
      const d = new Date(item.date);
      return {
        date: item.date,
        displayDate: Number.isNaN(d.getTime())
          ? item.date
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: item.count,
      };
    });
  }, [activityDateRange.from, activityDateRange.to, activityReport.dailyActivity, children, isSuperAdmin, mothers]);

  const timelineTotal = useMemo(() => timelineData.reduce((sum, item) => sum + (item.count || 0), 0), [timelineData]);

  // 2. Donut (Pie) Chart Data
  const donutInfo = useMemo(() => {
    if (isSuperAdmin) {
      const items = [
        { name: 'Active Accounts', value: staffMetrics.active, color: '#15803d' },
        { name: 'Unassigned Accounts', value: staffMetrics.unassigned, color: '#86efac' },
        { name: 'Suspended Accounts', value: staffMetrics.suspended, color: '#f59e0b' },
      ].filter((item) => item.value > 0);

      const total = staffMetrics.total || items.reduce((s, i) => s + i.value, 0) || 1;
      const activePct = Math.round((staffMetrics.active / total) * 100);

      return {
        title: 'Staff Distribution',
        subtitle: 'Operational account statuses',
        centerVal: `${activePct}%`,
        centerLabel: 'Active',
        data: items.length > 0 ? items : [{ name: 'Operational', value: 1, color: '#15803d' }],
      };
    }

    const monitoringModule = moduleSummaries.find((m) => m.key === 'monitoring');
    const checkedCount = monitoringModule?.metrics?.[0]?.value ?? 0;
    const notCheckedCount = monitoringModule?.metrics?.[1]?.value ?? 0;
    const totalBeneficiaries = mothers.length + children.length;

    const checked = typeof checkedCount === 'number' ? checkedCount : 0;
    const pending = typeof notCheckedCount === 'number' ? notCheckedCount : Math.max(0, totalBeneficiaries - checked);
    const followUps = stats.followUpCount;

    const items = [
      { name: 'Checked This Month', value: checked, color: '#15803d' },
      { name: 'Pending Check-up', value: Math.max(0, pending - followUps), color: '#86efac' },
      { name: 'Needs Follow-up', value: followUps, color: '#f59e0b' },
    ].filter((item) => item.value > 0);

    const safeTotal = totalBeneficiaries > 0 ? totalBeneficiaries : 1;
    const coveragePct = Math.min(100, Math.round((checked / safeTotal) * 100));

    return {
      title: 'Screening Coverage',
      subtitle: 'Monthly health check-up status',
      centerVal: totalBeneficiaries > 0 ? `${coveragePct}%` : '100%',
      centerLabel: 'Checked',
      data: items.length > 0 ? items : [
        { name: 'Mothers', value: Math.max(1, mothers.length), color: '#15803d' },
        { name: 'Children', value: Math.max(1, children.length), color: '#22c55e' },
      ],
    };
  }, [children.length, isSuperAdmin, moduleSummaries, mothers.length, staffMetrics, stats.followUpCount]);

  // 3. Bar Chart Data
  const barChartInfo = useMemo(() => {
    if (isSuperAdmin) {
      return {
        title: 'System Scope Breakdown',
        subtitle: 'Key operational entities',
        data: [
          { name: 'Staff', fullName: 'Active Staff', value: staffMetrics.active },
          { name: 'Schools', fullName: 'Schools', value: reportScopes.schools?.length || 0 },
          { name: 'Groups', fullName: 'Groups', value: reportScopes.groups?.length || 0 },
          { name: 'Pending', fullName: 'Unassigned Staff', value: staffMetrics.unassigned },
          { name: 'Unread', fullName: 'Unread Notifications', value: notificationCounts.unread || 0 },
        ],
      };
    }

    const incompleteBatches = getIncompleteBatchProgressOptions(children, communitySummary.batches || []);
    if (incompleteBatches.length > 0) {
      return {
        title: 'Batch Progress Comparison',
        subtitle: 'Completion percentage by batch',
        data: incompleteBatches.slice(0, 5).map((b) => ({
          name: b.name.length > 8 ? `${b.name.slice(0, 7)}…` : b.name,
          fullName: b.name,
          value: b.percentage ?? 0,
        })),
      };
    }

    return {
      title: 'Entity Overview',
      subtitle: 'Accessible organization counts',
      data: [
        { name: 'Mothers', fullName: 'Mothers Count', value: stats.motherCount },
        { name: 'Children', fullName: 'Children Count', value: stats.childCount },
        { name: 'Batches', fullName: 'Batches Count', value: stats.batchCount },
        { name: 'Groups', fullName: 'Groups Count', value: stats.groupCount },
        { name: 'Projects', fullName: 'Projects Count', value: stats.programCount },
      ],
    };
  }, [children, communitySummary.batches, isSuperAdmin, notificationCounts.unread, reportScopes, staffMetrics, stats]);

  // 4. Incomplete Batches for Focus / Milestones Card
  const incompleteBatches = useMemo(
    () => getIncompleteBatchProgressOptions(children, communitySummary.batches || []),
    [children, communitySummary.batches],
  );

  // 5. Screening Quick Actions from module summaries
  const screeningQuickStats = useMemo(() => {
    const monitoringModule = moduleSummaries.find((m) => m.key === 'monitoring');
    if (!monitoringModule) return [];
    return monitoringModule.metrics.slice(2).filter((m) => m.to);
  }, [moduleSummaries]);

  if (loading) return <PageSkeleton variant="dashboard" />;

  const description = isSuperAdmin
    ? 'Live overview of Community, User Management, Reports, and Notifications'
    : isHealthWorker
      ? 'Your assigned-group check-ins and follow-up tasks'
      : isCommunityOrganizer
        ? 'Manage beneficiaries, projects, and health workers for your school'
        : isAdmin || isPartner
          ? 'Organization-wide overview across all accessible schools, groups, beneficiaries, and projects'
          : `${roleLabel} workspace`;

  return (
    <div className="dashboard-shell">
      {/* --------------------------------------------------------------------------
          Top Header: Greeting, Subtitle & Action Controls
          -------------------------------------------------------------------------- */}
      <header className="dashboard-top-row">
        <div className="dashboard-welcome">
          <h2 data-guide="page-title">{getGreeting(currentUser?.name)}</h2>
          <p>{description}</p>
          {(isAdmin || isPartner) && (
            <span className="dashboard-scope-badge">Whole-level view · All accessible communities</span>
          )}
        </div>
        <div className="dashboard-top-actions">
          {canCreateBeneficiary && (
            <Link to="/beneficiary" className="dashboard-primary-action-btn" title="Add new beneficiary">
              <UserPlus size={16} aria-hidden="true" />
              <span>New Beneficiary</span>
            </Link>
          )}
          {canRecordMonitoring && !canCreateBeneficiary && (
            <Link to="/monitoring" className="dashboard-primary-action-btn" title="Record monitoring check-up">
              <Activity size={16} aria-hidden="true" />
              <span>Record Check-up</span>
            </Link>
          )}
          <AIReportingAssistantEntry buttonClassName="dashboard-ai-btn" />
        </div>
      </header>

      {(loadErrors.length > 0 || mothersError) && (
        <p className="dashboard-load-warning" role="alert">
          Some dashboard data could not be refreshed ({[...new Set([...loadErrors, ...(mothersError ? ['beneficiary records'] : [])])].join(', ')}). Displayed figures may be incomplete.
        </p>
      )}

      {/* --------------------------------------------------------------------------
          Row 1: KPI Stat Cards
          Avoid empty spaces by dynamically using grid class matching card count
          -------------------------------------------------------------------------- */}
      {displayCards.length > 0 && (
        <section
          className={`dashboard-kpi-grid dashboard-kpi-grid--${displayCards.length}`}
          aria-label="Key role metrics"
          data-guide="dashboard-summary"
        >
          {displayCards.map((card) => (
            <Link
              key={card.key}
              to={card.to}
              className="kpi-card"
              aria-label={`${card.title}: ${card.value}. ${card.subtitle}`}
            >
              <div className="kpi-card-header">
                <div className="kpi-icon-pill" aria-hidden="true">
                  {card.icon === 'users' && <Users size={18} />}
                  {card.icon === 'mothers' && <UserCheck size={18} />}
                  {card.icon === 'children' && <Baby size={18} />}
                  {card.icon === 'alert' && <AlertCircle size={18} />}
                  {card.icon === 'building' && <Building2 size={18} />}
                  {card.icon === 'projects' && <FolderKanban size={18} />}
                  {card.icon === 'clipboard' && <ClipboardList size={18} />}
                  {card.icon === 'health-workers' && <ShieldCheck size={18} />}
                </div>
                <span className="kpi-title">{card.title}</span>
                <ArrowRight className="kpi-more-arrow" size={16} aria-hidden="true" />
              </div>

              <div className="kpi-card-body">
                <span className="kpi-value">
                  {typeof card.value === 'number' && Number.isFinite(card.value)
                    ? card.value.toLocaleString()
                    : card.value}
                </span>
                {card.badge && (
                  <span className={`kpi-badge kpi-badge--${card.badgeType || 'positive'}`}>
                    {card.badgeType === 'positive' && <TrendingUp size={12} className="kpi-badge-icon" aria-hidden="true" />}
                    {card.badgeType === 'negative' && <TrendingDown size={12} className="kpi-badge-icon" aria-hidden="true" />}
                    {card.badgeType === 'warning' && <AlertCircle size={12} className="kpi-badge-icon" aria-hidden="true" />}
                    <span>{card.badge}</span>
                  </span>
                )}
              </div>

              <div className="kpi-card-footer">
                <span>{card.subtitle}</span>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* --------------------------------------------------------------------------
          Row 2: Primary Visualizations (AreaChart + Donut Chart)
          -------------------------------------------------------------------------- */}
      <section className="dashboard-charts-main-grid" aria-label="Visual data overviews" data-guide="dashboard-activity">
        {/* Main Performance / Trend AreaChart */}
        <article className="dashboard-chart-card dashboard-chart-card--main">
          <div className="dashboard-chart-header">
            <div>
              <h3 className="dashboard-chart-title">
                {isSuperAdmin ? 'Operational Activity' : 'Activity & Registration Trend'}
              </h3>
              <p className="dashboard-chart-subtitle">
                Last 30 days overview · {timelineTotal.toLocaleString()} total recorded
              </p>
            </div>
            <div className="dashboard-chart-legend">
              <span className="legend-dot" style={{ backgroundColor: '#15803d' }} />
              <span className="legend-text">
                {isSuperAdmin ? 'Daily Sign-ins' : 'Registrations'}
              </span>
            </div>
          </div>

          <div className="dashboard-chart-wrap" style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashboardGreenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#15803d" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#15803d" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="displayDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  minTickGap={24}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name={isSuperAdmin ? 'Sign-ins' : 'Records'}
                  stroke="#15803d"
                  strokeWidth={2.6}
                  fill="url(#dashboardGreenGrad)"
                  activeDot={{ r: 6, fill: '#15803d', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Donut Distribution Chart */}
        <article className="dashboard-chart-card dashboard-chart-card--donut">
          <div className="dashboard-chart-header">
            <div>
              <h3 className="dashboard-chart-title">{donutInfo.title}</h3>
              <p className="dashboard-chart-subtitle">{donutInfo.subtitle}</p>
            </div>
          </div>

          <div className="dashboard-donut-container">
            <div className="dashboard-donut-chart-wrap" style={{ width: '100%', height: 200, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<ChartTooltip />} />
                  <Pie
                    data={donutInfo.data}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutInfo.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#15803d'} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="dashboard-donut-center-badge">
                <span className="donut-center-val">{donutInfo.centerVal}</span>
                <span className="donut-center-label">{donutInfo.centerLabel}</span>
              </div>
            </div>

            <div className="dashboard-donut-legend-list">
              {donutInfo.data.map((item) => (
                <div key={item.name} className="donut-legend-item">
                  <span className="donut-legend-dot" style={{ backgroundColor: item.color }} />
                  <span className="donut-legend-label">{item.name}</span>
                  <span className="donut-legend-value">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      {/* --------------------------------------------------------------------------
          Row 3: Secondary Visualizations Grid (BarChart, Table, Milestones & AI)
          -------------------------------------------------------------------------- */}
      <section className="dashboard-charts-secondary-grid" aria-label="Detailed comparisons and recent entries">
        {/* Card 1: Bar Chart (Batch Comparison / Scopes) */}
        <article className="dashboard-chart-card dashboard-secondary-card dashboard-bar-card">
          <div className="dashboard-chart-header">
            <div>
              <h3 className="dashboard-chart-title">{barChartInfo.title}</h3>
              <p className="dashboard-chart-subtitle">{barChartInfo.subtitle}</p>
            </div>
          </div>
          <div className="dashboard-barchart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartInfo.data} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={0}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                  {barChartInfo.data.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={index === 0 ? '#15803d' : '#86efac'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        {/* Card 2: Recent Activity Table */}
        <article className="dashboard-chart-card dashboard-secondary-card dashboard-recent-card">
          <div className="dashboard-chart-header">
            <div>
              <h3 className="dashboard-chart-title">
                {isSuperAdmin ? 'Recent Sign-ins' : 'Recent Registrations'}
              </h3>
              <p className="dashboard-chart-subtitle">Latest recorded system entries</p>
            </div>
            <Link
              to={isSuperAdmin ? '/reports' : '/beneficiary'}
              className="dashboard-view-all-link"
              title={isSuperAdmin ? 'View full reports' : 'View all beneficiaries'}
            >
              <span>View All</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <div className="dashboard-table-container">
            {isSuperAdmin ? (
              activityReport.activities?.length ? (
                <table className="dashboard-modern-table">
                  <thead>
                    <tr>
                      <th scope="col">User</th>
                      <th scope="col">Status</th>
                      <th scope="col">Recorded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityReport.activities.slice(0, 5).map((activity) => {
                      const date = new Date(activity.createdAt);
                      return (
                        <tr key={activity.id}>
                          <td>
                            <span className="table-cell-bold" title={activity.actorName || 'Staff Member'}>
                              {activity.actorName || 'Staff Member'}
                            </span>
                          </td>
                          <td>
                            <span className="table-status-pill table-status-pill--green">Signed In</span>
                          </td>
                          <td className="table-cell-muted">
                            <div className="table-date-wrap">
                              <span className="table-time">
                                {Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="table-date">
                                {Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="dashboard-table-empty">No operational sign-in activity available.</p>
              )
            ) : (
              recentRecords.length ? (
                <table className="dashboard-modern-table">
                  <thead>
                    <tr>
                      <th scope="col">Record Name</th>
                      <th scope="col">Type</th>
                      <th scope="col">Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRecords.slice(0, 5).map((record) => (
                      <tr key={record.id}>
                        <td>
                          <span className="table-cell-bold" title={record.name}>
                            {record.name}
                          </span>
                        </td>
                        <td>
                          <span className={`table-status-pill ${record.type === 'Mother' ? 'table-status-pill--green' : 'table-status-pill--emerald'}`}>
                            {record.type}
                          </span>
                        </td>
                        <td className="table-cell-muted">
                          <span className="table-time">{record.date.toLocaleDateString()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="dashboard-table-empty">No recent registration dates recorded.</p>
              )
            )}
          </div>
        </article>

        {/* Card 3: Milestones & AI Assistant Card */}
        <article className="dashboard-chart-card dashboard-secondary-card dashboard-focus-card">
          <div className="dashboard-chart-header">
            <div>
              <h3 className="dashboard-chart-title">Key Milestones</h3>
              <p className="dashboard-chart-subtitle">Active progress tracking</p>
            </div>
          </div>

          <div className="dashboard-milestones-list">
            {incompleteBatches.length > 0 ? (
              incompleteBatches.slice(0, 2).map((batch) => (
                <div key={batch.id} className="milestone-item">
                  <div className="milestone-item-head">
                    <span className="milestone-name">{batch.name}</span>
                    <span className="milestone-pct">{batch.percentage}%</span>
                  </div>
                  <div className="milestone-progress-track">
                    <div
                      className="milestone-progress-fill"
                      style={{ width: `${Math.min(100, Math.max(0, batch.percentage || 0))}%` }}
                    />
                  </div>
                  <span className="milestone-desc">
                    {batch.completed} of {batch.total} children completed 24 months
                  </span>
                </div>
              ))
            ) : isSuperAdmin ? (
              <>
                <div className="milestone-item">
                  <div className="milestone-item-head">
                    <span className="milestone-name">Active Staff Health</span>
                    <span className="milestone-pct">
                      {staffMetrics.total ? Math.round((staffMetrics.active / staffMetrics.total) * 100) : 100}%
                    </span>
                  </div>
                  <div className="milestone-progress-track">
                    <div
                      className="milestone-progress-fill"
                      style={{ width: `${staffMetrics.total ? Math.round((staffMetrics.active / staffMetrics.total) * 100) : 100}%` }}
                    />
                  </div>
                  <span className="milestone-desc">
                    {staffMetrics.active} of {staffMetrics.total} operational accounts active
                  </span>
                </div>

                <div className="milestone-item">
                  <div className="milestone-item-head">
                    <span className="milestone-name">School Assignments</span>
                    <span className="milestone-pct">
                      {staffMetrics.active ? Math.round(((staffMetrics.active - staffMetrics.unassigned) / staffMetrics.active) * 100) : 100}%
                    </span>
                  </div>
                  <div className="milestone-progress-track">
                    <div
                      className="milestone-progress-fill"
                      style={{ width: `${staffMetrics.active ? Math.round(((staffMetrics.active - staffMetrics.unassigned) / staffMetrics.active) * 100) : 100}%` }}
                    />
                  </div>
                  <span className="milestone-desc">
                    {staffMetrics.unassigned > 0
                      ? `${staffMetrics.unassigned} accounts need school assignment`
                      : 'All active staff assigned to schools'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="milestone-item">
                  <div className="milestone-item-head">
                    <span className="milestone-name">Beneficiary Scope</span>
                    <span className="milestone-pct">{stats.motherCount + stats.childCount} Total</span>
                  </div>
                  <div className="milestone-progress-track">
                    <div className="milestone-progress-fill" style={{ width: '100%' }} />
                  </div>
                  <span className="milestone-desc">{stats.motherCount} mothers · {stats.childCount} children registered</span>
                </div>

                <div className="milestone-item">
                  <div className="milestone-item-head">
                    <span className="milestone-name">Follow-Up Compliance</span>
                    <span className="milestone-pct">
                      {stats.followUpCount === 0 ? '100%' : `${stats.followUpCount} Pending`}
                    </span>
                  </div>
                  <div className="milestone-progress-track">
                    <div
                      className="milestone-progress-fill"
                      style={{
                        width: stats.motherCount + stats.childCount > 0
                          ? `${Math.max(10, 100 - Math.round((stats.followUpCount / (stats.motherCount + stats.childCount)) * 100))}%`
                          : '100%',
                      }}
                    />
                  </div>
                  <span className="milestone-desc">
                    {stats.followUpCount === 0
                      ? 'All check-up schedules up to date'
                      : `${stats.followUpCount} beneficiaries require follow-up check-in`}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* AI Insights Box inside the card */}
          <div className="dashboard-ai-insights-box">
            <div className="ai-insight-header">
              <Sparkles size={16} className="ai-insight-sparkle-icon" aria-hidden="true" />
              <strong className="ai-insight-title">AI Operational Insight</strong>
            </div>
            <p className="ai-insight-text">
              {stats.followUpCount > 0
                ? `${stats.followUpCount} beneficiaries require follow-up attention this cycle.`
                : 'All screening schedules are healthy and up to date for this period.'}
            </p>
            <AIReportingAssistantEntry
              buttonClassName="ai-assistant-card-btn"
              label="Open AI Assistant"
            />
          </div>
        </article>
      </section>

      {/* --------------------------------------------------------------------------
          Screening & Module Quick Action Strip
          -------------------------------------------------------------------------- */}
      {screeningQuickStats.length > 0 && (
        <section className="dashboard-screening-quickstrip" aria-label="Screening follow-up shortcuts">
          <div className="screening-quickstrip-label">
            <span className="screening-pulse-dot" />
            <span>Screening Action Filters:</span>
          </div>
          <div className="screening-chips-row">
            {screeningQuickStats.map((metric) => (
              <Link
                key={metric.label}
                to={metric.to}
                className={`screening-chip ${metric.value > 0 ? 'is-active' : ''}`}
                title={`View ${metric.label}`}
              >
                <span className="screening-chip-name">{metric.label}</span>
                <span className="screening-chip-badge">{metric.value}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
