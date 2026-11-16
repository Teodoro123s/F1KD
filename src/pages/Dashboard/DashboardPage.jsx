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

const kpiBadgeClasses = {
  positive: 'bg-[#ecfdf5] text-[#15803d] border border-[#a7f3d0]',
  warning: 'bg-[#fffbeb] text-[#b45309] border border-[#fde68a]',
  negative: 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]',
  neutral: 'bg-[#f8fafc] text-[#475569] border border-[#e2e8f0]',
};

/* Custom Chart Tooltip */
function ChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="dashboard-chart-tooltip pointer-events-none rounded-xl border border-[#e2e8f0] bg-white px-[0.85rem] py-[0.6rem] text-[0.8rem] shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        {label && <div className="tooltip-label mb-[0.35rem] font-bold text-[#0f172a]">{label}</div>}
        {payload.map((entry, index) => (
          <div key={`tip-${index}`} className="tooltip-item flex items-center gap-[0.45rem] text-[#475569]">
            <span
              className="tooltip-dot h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill || '#15803d' }}
            />
            <span className="tooltip-name font-medium">{entry.name || 'Count'}:</span>
            <span className="tooltip-val ml-2 font-bold text-[#0f172a]">{Number(entry.value).toLocaleString()}</span>
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
    <div className="dashboard-shell box-border mx-auto flex max-w-[1480px] flex-col gap-5 px-6 pt-5 pb-10 max-[640px]:gap-4 max-[640px]:p-[0.85rem]">
      {/* --------------------------------------------------------------------------
          Top Header: Greeting, Subtitle & Action Controls
          -------------------------------------------------------------------------- */}
      <header className="dashboard-top-row flex flex-wrap items-center justify-between gap-5 py-1 max-[640px]:flex-col max-[640px]:items-start">
        <div className="dashboard-welcome flex flex-col gap-1">
          <h2 className="m-0 text-[clamp(1.4rem,2.2vw,1.85rem)] font-extrabold leading-[1.25] tracking-[-0.025em] text-[#0f172a]" data-guide="page-title">{getGreeting(currentUser?.name)}</h2>
          <p className="m-0 text-[0.92rem] font-medium text-[#64748b]">{description}</p>
          {(isAdmin || isPartner) && (
            <span className="dashboard-scope-badge mt-[0.4rem] inline-flex self-start rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-[0.65rem] py-[0.2rem] text-[0.72rem] font-bold text-[#166534]">Whole-level view · All accessible communities</span>
          )}
        </div>
        <div className="dashboard-top-actions flex flex-wrap items-center gap-3 max-[640px]:w-full">
          {canCreateBeneficiary && (
            <Link to="/beneficiary" className="dashboard-primary-action-btn inline-flex items-center gap-[0.45rem] rounded-xl bg-[#15803d] px-4 py-[0.55rem] text-[0.84rem] font-semibold text-white no-underline shadow-[0_2px_8px_rgba(21,128,61,0.25)] transition-all duration-[150ms] ease-[ease] hover:-translate-y-px hover:bg-[#166534] hover:shadow-[0_4px_12px_rgba(21,128,61,0.35)] max-[640px]:flex-[1_1_auto] max-[640px]:justify-center" title="Add new beneficiary">
              <UserPlus size={16} aria-hidden="true" />
              <span>New Beneficiary</span>
            </Link>
          )}
          {canRecordMonitoring && !canCreateBeneficiary && (
            <Link to="/monitoring" className="dashboard-primary-action-btn inline-flex items-center gap-[0.45rem] rounded-xl bg-[#15803d] px-4 py-[0.55rem] text-[0.84rem] font-semibold text-white no-underline shadow-[0_2px_8px_rgba(21,128,61,0.25)] transition-all duration-[150ms] ease-[ease] hover:-translate-y-px hover:bg-[#166534] hover:shadow-[0_4px_12px_rgba(21,128,61,0.35)] max-[640px]:flex-[1_1_auto] max-[640px]:justify-center" title="Record monitoring check-up">
              <Activity size={16} aria-hidden="true" />
              <span>Record Check-up</span>
            </Link>
          )}
          <AIReportingAssistantEntry buttonClassName="dashboard-ai-btn inline-flex cursor-pointer items-center gap-[0.45rem] rounded-xl border-0 bg-[linear-gradient(135deg,#15803d_0%,#22c55e_100%)] px-4 py-[0.55rem] text-[0.84rem] font-semibold text-white shadow-[0_3px_10px_rgba(34,197,94,0.25)] transition-all duration-[150ms] ease-[ease] hover:-translate-y-px hover:shadow-[0_5px_14px_rgba(34,197,94,0.35)] max-[640px]:flex-[1_1_auto] max-[640px]:justify-center" />
        </div>
      </header>

      {(loadErrors.length > 0 || mothersError) && (
        <p className="dashboard-load-warning m-0 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-[0.84rem] font-medium text-[#92400e]" role="alert">
          Some dashboard data could not be refreshed ({[...new Set([...loadErrors, ...(mothersError ? ['beneficiary records'] : [])])].join(', ')}). Displayed figures may be incomplete.
        </p>
      )}

      {/* --------------------------------------------------------------------------
          Row 1: KPI Stat Cards
          Avoid empty spaces by dynamically using grid class matching card count
          -------------------------------------------------------------------------- */}
      {displayCards.length > 0 && (
        <section
          className={`dashboard-kpi-grid grid grid-cols-1 gap-4 ${displayCards.length === 3
            ? 'min-[641px]:grid-cols-2 min-[901px]:grid-cols-3'
            : 'min-[641px]:grid-cols-2 min-[1081px]:grid-cols-4'}`}
          aria-label="Key role metrics"
          data-guide="dashboard-summary"
        >
          {displayCards.map((card, index) => (
            <Link
              key={card.key}
              to={card.to}
              className={`kpi-card group relative flex flex-col gap-[0.65rem] rounded-[20px] border border-[#edf2f7] bg-white px-[1.35rem] py-5 text-inherit no-underline shadow-[0_4px_20px_rgba(15,23,42,0.03)] transition-[transform,box-shadow,border-color] duration-[180ms] ease-[ease] hover:-translate-y-[3px] hover:border-[#cbd5e1] hover:shadow-[0_10px_28px_rgba(15,23,42,0.07)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#15803d] focus-visible:outline-offset-2 max-[640px]:px-[1.1rem] max-[640px]:py-4 ${displayCards.length === 3 && index === displayCards.length - 1 ? 'min-[641px]:max-[900px]:col-span-2' : ''}`}
              aria-label={`${card.title}: ${card.value}. ${card.subtitle}`}
            >
              <div className="kpi-card-header flex items-center gap-[0.65rem]">
                <div className="kpi-icon-pill inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#f0fdf4] text-[#15803d]" aria-hidden="true">
                  {card.icon === 'users' && <Users size={18} />}
                  {card.icon === 'mothers' && <UserCheck size={18} />}
                  {card.icon === 'children' && <Baby size={18} />}
                  {card.icon === 'alert' && <AlertCircle size={18} />}
                  {card.icon === 'building' && <Building2 size={18} />}
                  {card.icon === 'projects' && <FolderKanban size={18} />}
                  {card.icon === 'clipboard' && <ClipboardList size={18} />}
                  {card.icon === 'health-workers' && <ShieldCheck size={18} />}
                </div>
                <span className="kpi-title flex-[1_1_auto] text-[0.88rem] font-semibold text-[#475569]">{card.title}</span>
                <ArrowRight className="kpi-more-arrow shrink-0 text-[#94a3b8] transition-[transform,color] duration-[150ms] ease-[ease] group-hover:translate-x-[3px] group-hover:text-[#15803d]" size={16} aria-hidden="true" />
              </div>

              <div className="kpi-card-body flex items-baseline justify-between gap-2">
                <span className="kpi-value text-[1.85rem] font-extrabold leading-none tracking-[-0.03em] text-[#0f172a]">
                  {typeof card.value === 'number' && Number.isFinite(card.value)
                    ? card.value.toLocaleString()
                    : card.value}
                </span>
                {card.badge && (
                  <span className={`kpi-badge inline-flex items-center gap-[0.3rem] whitespace-nowrap rounded-full px-[0.55rem] py-[0.22rem] text-[0.73rem] font-bold ${kpiBadgeClasses[card.badgeType] || kpiBadgeClasses.positive}`}>
                    {card.badgeType === 'positive' && <TrendingUp size={12} className="kpi-badge-icon shrink-0" aria-hidden="true" />}
                    {card.badgeType === 'negative' && <TrendingDown size={12} className="kpi-badge-icon shrink-0" aria-hidden="true" />}
                    {card.badgeType === 'warning' && <AlertCircle size={12} className="kpi-badge-icon shrink-0" aria-hidden="true" />}
                    <span>{card.badge}</span>
                  </span>
                )}
              </div>

              <div className="kpi-card-footer overflow-hidden text-ellipsis whitespace-nowrap text-[0.78rem] font-medium text-[#64748b]">
                <span>{card.subtitle}</span>
              </div>
            </Link>
          ))}
        </section>
      )}

      {/* --------------------------------------------------------------------------
          Row 2: Primary Visualizations (AreaChart + Donut Chart)
          -------------------------------------------------------------------------- */}
      <section className="dashboard-charts-main-grid grid grid-cols-[1.55fr_1fr] gap-5 max-[960px]:grid-cols-1" aria-label="Visual data overviews" data-guide="dashboard-activity">
        {/* Main Performance / Trend AreaChart */}
        <article className="dashboard-chart-card dashboard-chart-card--main relative flex flex-col overflow-hidden rounded-[20px] border border-[#edf2f7] bg-white px-[1.45rem] py-5 shadow-[0_4px_20px_rgba(15,23,42,0.03)]">
          <div className="dashboard-chart-header mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="dashboard-chart-title m-0 text-base font-bold tracking-[-0.015em] text-[#0f172a]">
                {isSuperAdmin ? 'Operational Activity' : 'Activity & Registration Trend'}
              </h3>
              <p className="dashboard-chart-subtitle mt-[0.2rem] mb-0 text-[0.8rem] font-medium text-[#64748b]">
                Last 30 days overview · {timelineTotal.toLocaleString()} total recorded
              </p>
            </div>
            <div className="dashboard-chart-legend flex items-center gap-[0.4rem] text-[0.78rem] font-semibold text-[#475569]">
              <span className="legend-dot inline-block h-2 w-2 rounded-full" style={{ backgroundColor: '#15803d' }} />
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
        <article className="dashboard-chart-card dashboard-chart-card--donut relative flex flex-col overflow-hidden rounded-[20px] border border-[#edf2f7] bg-white px-[1.45rem] py-5 shadow-[0_4px_20px_rgba(15,23,42,0.03)]">
          <div className="dashboard-chart-header mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="dashboard-chart-title m-0 text-base font-bold tracking-[-0.015em] text-[#0f172a]">{donutInfo.title}</h3>
              <p className="dashboard-chart-subtitle mt-[0.2rem] mb-0 text-[0.8rem] font-medium text-[#64748b]">{donutInfo.subtitle}</p>
            </div>
          </div>

          <div className="dashboard-donut-container flex flex-[1_1_auto] flex-col items-center gap-3">
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
              <div className="dashboard-donut-center-badge pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center">
                <span className="donut-center-val text-[1.35rem] font-extrabold leading-none text-[#0f172a]">{donutInfo.centerVal}</span>
                <span className="donut-center-label mt-[0.2rem] text-[0.72rem] font-semibold text-[#64748b]">{donutInfo.centerLabel}</span>
              </div>
            </div>

            <div className="dashboard-donut-legend-list mt-2 flex w-full flex-col gap-[0.45rem]">
              {donutInfo.data.map((item) => (
                <div key={item.name} className="donut-legend-item flex items-center gap-[0.55rem] rounded-lg px-[0.4rem] py-1 text-[0.82rem] text-[#334155] transition-[background] duration-[120ms] ease-[ease] hover:bg-[#f8fafc]">
                  <span className="donut-legend-dot h-[10px] w-[10px] shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="donut-legend-label flex-[1_1_auto] font-medium">{item.name}</span>
                  <span className="donut-legend-value font-bold text-[#0f172a]">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      {/* --------------------------------------------------------------------------
          Row 3: Secondary Visualizations Grid (BarChart, Table, Milestones & AI)
          -------------------------------------------------------------------------- */}
      <section className="dashboard-charts-secondary-grid grid grid-cols-[1.05fr_1.35fr_1fr] gap-5 max-[1120px]:grid-cols-2 max-[768px]:grid-cols-1" aria-label="Detailed comparisons and recent entries">
        {/* Card 1: Bar Chart (Batch Comparison / Scopes) */}
        <article className="dashboard-chart-card dashboard-secondary-card dashboard-bar-card flex flex-col relative overflow-hidden rounded-[20px] border border-[#edf2f7] bg-white px-[1.45rem] py-5 shadow-[0_4px_20px_rgba(15,23,42,0.03)]">
          <div className="dashboard-chart-header mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="dashboard-chart-title m-0 text-base font-bold tracking-[-0.015em] text-[#0f172a]">{barChartInfo.title}</h3>
              <p className="dashboard-chart-subtitle mt-[0.2rem] mb-0 text-[0.8rem] font-medium text-[#64748b]">{barChartInfo.subtitle}</p>
            </div>
          </div>
          <div className="dashboard-barchart-wrap min-h-[240px] w-full flex-[1_1_auto]">
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
        <article className="dashboard-chart-card dashboard-secondary-card dashboard-recent-card relative flex flex-col overflow-hidden rounded-[20px] border border-[#edf2f7] bg-white px-[1.45rem] py-5 shadow-[0_4px_20px_rgba(15,23,42,0.03)]">
          <div className="dashboard-chart-header mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="dashboard-chart-title m-0 text-base font-bold tracking-[-0.015em] text-[#0f172a]">
                {isSuperAdmin ? 'Recent Sign-ins' : 'Recent Registrations'}
              </h3>
              <p className="dashboard-chart-subtitle mt-[0.2rem] mb-0 text-[0.8rem] font-medium text-[#64748b]">Latest recorded system entries</p>
            </div>
            <Link
              to={isSuperAdmin ? '/reports' : '/beneficiary'}
              className="dashboard-view-all-link group inline-flex items-center gap-[0.35rem] text-[0.8rem] font-semibold text-[#15803d] no-underline transition-[color] duration-[150ms] ease-[ease] hover:text-[#166534]"
              title={isSuperAdmin ? 'View full reports' : 'View all beneficiaries'}
            >
              <span>View All</span>
              <ArrowRight className="transition-transform duration-[150ms] ease-[ease] group-hover:translate-x-[3px]" size={14} aria-hidden="true" />
            </Link>
          </div>

          <div className="dashboard-table-container flex-[1_1_auto] overflow-x-auto">
            {isSuperAdmin ? (
              activityReport.activities?.length ? (
                <table className="dashboard-modern-table w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <th className="border-b border-[#f1f5f9] px-[0.4rem] py-[0.55rem] text-[0.72rem] font-bold uppercase tracking-[0.04em] text-[#64748b]" scope="col">User</th>
                      <th className="w-[95px] border-b border-[#f1f5f9] px-[0.4rem] py-[0.55rem] text-center text-[0.72rem] font-bold uppercase tracking-[0.04em] text-[#64748b]" scope="col">Status</th>
                      <th className="border-b border-[#f1f5f9] px-[0.4rem] py-[0.55rem] text-right text-[0.72rem] font-bold uppercase tracking-[0.04em] text-[#64748b]" scope="col">Recorded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityReport.activities.slice(0, 5).map((activity) => {
                      const date = new Date(activity.createdAt);
                      return (
                        <tr key={activity.id} className="group">
                          <td className="align-middle border-b border-[#f8fafc] px-[0.4rem] py-[0.55rem] text-[0.82rem] text-[#334155] group-hover:bg-[#f8fafc]">
                            <span className="table-cell-bold block max-w-[155px] overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[#0f172a]" title={activity.actorName || 'Staff Member'}>
                              {activity.actorName || 'Staff Member'}
                            </span>
                          </td>
                          <td className="w-[95px] align-middle border-b border-[#f8fafc] px-[0.4rem] py-[0.55rem] text-center text-[0.82rem] text-[#334155] group-hover:bg-[#f8fafc]">
                            <span className="table-status-pill table-status-pill--green inline-flex items-center justify-center whitespace-nowrap rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-[0.6rem] py-[0.22rem] text-[0.72rem] font-bold leading-[1.2] text-[#15803d]">Signed In</span>
                          </td>
                          <td className="table-cell-muted align-middle whitespace-nowrap border-b border-[#f8fafc] px-[0.4rem] py-[0.55rem] text-right text-[0.76rem] text-[#64748b] group-hover:bg-[#f8fafc]">
                            <div className="table-date-wrap flex flex-col items-end leading-[1.25]">
                              <span className="table-time whitespace-nowrap text-[0.76rem] font-semibold text-[#334155]">
                                {Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="table-date whitespace-nowrap text-[0.7rem] text-[#94a3b8]">
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
                <p className="dashboard-table-empty my-6 text-center text-[0.84rem] text-[#94a3b8]">No operational sign-in activity available.</p>
              )
            ) : (
              recentRecords.length ? (
                <table className="dashboard-modern-table w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <th className="border-b border-[#f1f5f9] px-[0.4rem] py-[0.55rem] text-[0.72rem] font-bold uppercase tracking-[0.04em] text-[#64748b]" scope="col">Record Name</th>
                      <th className="w-[95px] border-b border-[#f1f5f9] px-[0.4rem] py-[0.55rem] text-center text-[0.72rem] font-bold uppercase tracking-[0.04em] text-[#64748b]" scope="col">Type</th>
                      <th className="border-b border-[#f1f5f9] px-[0.4rem] py-[0.55rem] text-right text-[0.72rem] font-bold uppercase tracking-[0.04em] text-[#64748b]" scope="col">Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRecords.slice(0, 5).map((record) => (
                      <tr key={record.id} className="group">
                        <td className="align-middle border-b border-[#f8fafc] px-[0.4rem] py-[0.55rem] text-[0.82rem] text-[#334155] group-hover:bg-[#f8fafc]">
                          <span className="table-cell-bold block max-w-[155px] overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-[#0f172a]" title={record.name}>
                            {record.name}
                          </span>
                        </td>
                        <td className="w-[95px] align-middle border-b border-[#f8fafc] px-[0.4rem] py-[0.55rem] text-center text-[0.82rem] text-[#334155] group-hover:bg-[#f8fafc]">
                          <span className={`table-status-pill inline-flex items-center justify-center whitespace-nowrap rounded-full border px-[0.6rem] py-[0.22rem] text-[0.72rem] font-bold leading-[1.2] ${record.type === 'Mother' ? 'table-status-pill--green border-[#a7f3d0] bg-[#ecfdf5] text-[#15803d]' : 'table-status-pill--emerald border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]'}`}>
                            {record.type}
                          </span>
                        </td>
                        <td className="table-cell-muted align-middle whitespace-nowrap border-b border-[#f8fafc] px-[0.4rem] py-[0.55rem] text-right text-[0.76rem] text-[#64748b] group-hover:bg-[#f8fafc]">
                          <span className="table-time whitespace-nowrap text-[0.76rem] font-semibold text-[#334155]">{record.date.toLocaleDateString()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="dashboard-table-empty my-6 text-center text-[0.84rem] text-[#94a3b8]">No recent registration dates recorded.</p>
              )
            )}
          </div>
        </article>

        {/* Card 3: Milestones & AI Assistant Card */}
        <article className="dashboard-chart-card dashboard-secondary-card dashboard-focus-card relative flex flex-col overflow-hidden rounded-[20px] border border-[#edf2f7] bg-white px-[1.45rem] py-5 shadow-[0_4px_20px_rgba(15,23,42,0.03)] max-[1120px]:col-span-full">
          <div className="dashboard-chart-header mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="dashboard-chart-title m-0 text-base font-bold tracking-[-0.015em] text-[#0f172a]">Key Milestones</h3>
              <p className="dashboard-chart-subtitle mt-[0.2rem] mb-0 text-[0.8rem] font-medium text-[#64748b]">Active progress tracking</p>
            </div>
          </div>

          <div className="dashboard-milestones-list mb-4 flex flex-[1_1_auto] flex-col gap-[0.8rem]">
            {incompleteBatches.length > 0 ? (
              incompleteBatches.slice(0, 2).map((batch) => (
                <div key={batch.id} className="milestone-item flex flex-col gap-[0.35rem]">
                  <div className="milestone-item-head flex items-center justify-between text-[0.82rem]">
                    <span className="milestone-name font-semibold text-[#0f172a]">{batch.name}</span>
                    <span className="milestone-pct font-bold text-[#15803d]">{batch.percentage}%</span>
                  </div>
                  <div className="milestone-progress-track h-2 w-full overflow-hidden rounded-full bg-[#f1f5f9]">
                    <div
                      className="milestone-progress-fill h-full rounded-full bg-[linear-gradient(90deg,#15803d_0%,#22c55e_100%)] transition-[width] duration-300 ease-[ease]"
                      style={{ width: `${Math.min(100, Math.max(0, batch.percentage || 0))}%` }}
                    />
                  </div>
                  <span className="milestone-desc text-[0.72rem] text-[#64748b]">
                    {batch.completed} of {batch.total} children completed 24 months
                  </span>
                </div>
              ))
            ) : isSuperAdmin ? (
              <>
                <div className="milestone-item flex flex-col gap-[0.35rem]">
                  <div className="milestone-item-head flex items-center justify-between text-[0.82rem]">
                    <span className="milestone-name font-semibold text-[#0f172a]">Active Staff Health</span>
                    <span className="milestone-pct font-bold text-[#15803d]">
                      {staffMetrics.total ? Math.round((staffMetrics.active / staffMetrics.total) * 100) : 100}%
                    </span>
                  </div>
                  <div className="milestone-progress-track h-2 w-full overflow-hidden rounded-full bg-[#f1f5f9]">
                    <div
                      className="milestone-progress-fill h-full rounded-full bg-[linear-gradient(90deg,#15803d_0%,#22c55e_100%)] transition-[width] duration-300 ease-[ease]"
                      style={{ width: `${staffMetrics.total ? Math.round((staffMetrics.active / staffMetrics.total) * 100) : 100}%` }}
                    />
                  </div>
                  <span className="milestone-desc text-[0.72rem] text-[#64748b]">
                    {staffMetrics.active} of {staffMetrics.total} operational accounts active
                  </span>
                </div>

                <div className="milestone-item flex flex-col gap-[0.35rem]">
                  <div className="milestone-item-head flex items-center justify-between text-[0.82rem]">
                    <span className="milestone-name font-semibold text-[#0f172a]">School Assignments</span>
                    <span className="milestone-pct font-bold text-[#15803d]">
                      {staffMetrics.active ? Math.round(((staffMetrics.active - staffMetrics.unassigned) / staffMetrics.active) * 100) : 100}%
                    </span>
                  </div>
                  <div className="milestone-progress-track h-2 w-full overflow-hidden rounded-full bg-[#f1f5f9]">
                    <div
                      className="milestone-progress-fill h-full rounded-full bg-[linear-gradient(90deg,#15803d_0%,#22c55e_100%)] transition-[width] duration-300 ease-[ease]"
                      style={{ width: `${staffMetrics.active ? Math.round(((staffMetrics.active - staffMetrics.unassigned) / staffMetrics.active) * 100) : 100}%` }}
                    />
                  </div>
                  <span className="milestone-desc text-[0.72rem] text-[#64748b]">
                    {staffMetrics.unassigned > 0
                      ? `${staffMetrics.unassigned} accounts need school assignment`
                      : 'All active staff assigned to schools'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="milestone-item flex flex-col gap-[0.35rem]">
                  <div className="milestone-item-head flex items-center justify-between text-[0.82rem]">
                    <span className="milestone-name font-semibold text-[#0f172a]">Beneficiary Scope</span>
                    <span className="milestone-pct font-bold text-[#15803d]">{stats.motherCount + stats.childCount} Total</span>
                  </div>
                  <div className="milestone-progress-track h-2 w-full overflow-hidden rounded-full bg-[#f1f5f9]">
                    <div className="milestone-progress-fill h-full rounded-full bg-[linear-gradient(90deg,#15803d_0%,#22c55e_100%)] transition-[width] duration-300 ease-[ease]" style={{ width: '100%' }} />
                  </div>
                  <span className="milestone-desc text-[0.72rem] text-[#64748b]">{stats.motherCount} mothers · {stats.childCount} children registered</span>
                </div>

                <div className="milestone-item flex flex-col gap-[0.35rem]">
                  <div className="milestone-item-head flex items-center justify-between text-[0.82rem]">
                    <span className="milestone-name font-semibold text-[#0f172a]">Follow-Up Compliance</span>
                    <span className="milestone-pct font-bold text-[#15803d]">
                      {stats.followUpCount === 0 ? '100%' : `${stats.followUpCount} Pending`}
                    </span>
                  </div>
                  <div className="milestone-progress-track h-2 w-full overflow-hidden rounded-full bg-[#f1f5f9]">
                    <div
                      className="milestone-progress-fill h-full rounded-full bg-[linear-gradient(90deg,#15803d_0%,#22c55e_100%)] transition-[width] duration-300 ease-[ease]"
                      style={{
                        width: stats.motherCount + stats.childCount > 0
                          ? `${Math.max(10, 100 - Math.round((stats.followUpCount / (stats.motherCount + stats.childCount)) * 100))}%`
                          : '100%',
                      }}
                    />
                  </div>
                  <span className="milestone-desc text-[0.72rem] text-[#64748b]">
                    {stats.followUpCount === 0
                      ? 'All check-up schedules up to date'
                      : `${stats.followUpCount} beneficiaries require follow-up check-in`}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* AI Insights Box inside the card */}
          <div className="dashboard-ai-insights-box mt-auto flex flex-col gap-[0.45rem] rounded-[14px] border border-[#bbf7d0] bg-[#f0fdf4] px-[0.95rem] py-3">
            <div className="ai-insight-header flex items-center gap-[0.4rem]">
              <Sparkles size={16} className="ai-insight-sparkle-icon" aria-hidden="true" />
              <strong className="ai-insight-title text-[0.82rem] font-bold text-[#166534]">AI Operational Insight</strong>
            </div>
            <p className="ai-insight-text m-0 text-[0.76rem] leading-[1.4] text-[#15803d]">
              {stats.followUpCount > 0
                ? `${stats.followUpCount} beneficiaries require follow-up attention this cycle.`
                : 'All screening schedules are healthy and up to date for this period.'}
            </p>
            <AIReportingAssistantEntry
              buttonClassName="ai-assistant-card-btn mt-[0.35rem] inline-flex w-full cursor-pointer items-center justify-center gap-[0.4rem] rounded-[10px] border-0 bg-[linear-gradient(135deg,#15803d_0%,#16a34a_100%)] px-3 py-[0.48rem] text-[0.8rem] font-semibold text-white shadow-[0_2px_6px_rgba(21,128,61,0.2)] transition-all duration-[150ms] ease-[ease] hover:bg-[#14532d] hover:shadow-[0_4px_10px_rgba(21,128,61,0.3)]"
              label="Open AI Assistant"
            />
          </div>
        </article>
      </section>

      {/* --------------------------------------------------------------------------
          Screening & Module Quick Action Strip
          -------------------------------------------------------------------------- */}
      {screeningQuickStats.length > 0 && (
        <section className="dashboard-screening-quickstrip flex flex-wrap items-center gap-3 rounded-2xl border border-[#edf2f7] bg-white px-5 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.02)]" aria-label="Screening follow-up shortcuts">
          <div className="screening-quickstrip-label flex items-center gap-2 text-[0.82rem] font-bold text-[#0f172a]">
            <span className="screening-pulse-dot h-2 w-2 rounded-full bg-[#15803d] shadow-[0_0_0_3px_rgba(21,128,61,0.2)]" />
            <span>Screening Action Filters:</span>
          </div>
          <div className="screening-chips-row flex flex-wrap items-center gap-2">
            {screeningQuickStats.map((metric) => (
              <Link
                key={metric.label}
                to={metric.to}
                className={`screening-chip inline-flex items-center gap-[0.45rem] rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-3 py-[0.35rem] text-[0.78rem] font-semibold text-[#475569] no-underline transition-all duration-[140ms] ease-[ease] hover:border-[#bbf7d0] hover:bg-[#f0fdf4] hover:text-[#15803d] ${metric.value > 0 ? 'border-[#86efac] bg-[#f0fdf4] text-[#15803d] hover:border-[#86efac]' : ''}`}
                title={`View ${metric.label}`}
              >
                <span className="screening-chip-name">{metric.label}</span>
                <span className="screening-chip-badge inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#15803d] px-[5px] text-[0.7rem] font-bold text-white">{metric.value}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
