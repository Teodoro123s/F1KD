import { hasCheckupThisMonth } from '../../utils/beneficiary/monthlyCheckups.js';
import { normalizeRole, ROLES } from '../../utils/permissions.js';
import { getMonthlyDevelopmentalStatus, getMonitoringScreeningRoute } from '../Monitoring/monitoringScreeningUtils.mjs';

function getCompletedChildMonitoringMonths(child) {
  const months = new Set();
  const completedWeeks = Array.isArray(child.completedWeeks) ? child.completedWeeks : [];
  const checkups = Array.isArray(child.checkups) ? child.checkups.flat(Infinity) : [];

  [...completedWeeks, ...checkups.map((checkup) => checkup?.weekNumber ?? checkup?.week_number)]
    .forEach((value) => {
      const month = Number(value);
      if (Number.isInteger(month) && month >= 1 && month <= 24) months.add(month);
    });

  return months;
}

export function getBatchChildMonitoringProgress(children = []) {
  const batchChildren = children.filter((child) => (
    (child.batchId ?? child.batch_id) !== undefined
      && (child.batchId ?? child.batch_id) !== null
      && String(child.batchId ?? child.batch_id).trim() !== ''
  ));
  const completed = batchChildren.filter((child) => getCompletedChildMonitoringMonths(child).size === 24).length;

  return {
    completed,
    total: batchChildren.length,
    percentage: batchChildren.length ? Math.round((completed / batchChildren.length) * 100) : null,
  };
}

export function getIncompleteBatchProgressOptions(children = [], batches = []) {
  const batchNames = new Map(batches
    .filter((batch) => batch?.id !== undefined && batch?.id !== null)
    .map((batch) => [String(batch.id), String(batch.name || batch.batchName || batch.batch_name || '').trim()]));
  const childrenByBatch = new Map();

  children.forEach((child) => {
    const batchId = child.batchId ?? child.batch_id;
    if (batchId === undefined || batchId === null || String(batchId).trim() === '') return;
    const key = String(batchId);
    if (!childrenByBatch.has(key)) childrenByBatch.set(key, []);
    childrenByBatch.get(key).push(child);
  });

  return [...childrenByBatch.entries()]
    .map(([id, batchChildren]) => {
      const progress = getBatchChildMonitoringProgress(batchChildren);
      return {
        id,
        name: batchNames.get(id)
          || String(batchChildren[0]?.batchName || batchChildren[0]?.batch_name || batchChildren[0]?.batch || `Batch ${id}`),
        ...progress,
      };
    })
    .filter((batch) => batch.percentage !== null && batch.percentage < 100)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function buildOperationalStaffMetrics(users = []) {
  const operationalRoles = new Set([
    ROLES.ADMIN,
    ROLES.PARTNER,
    ROLES.HEALTH_WORKER,
    ROLES.COMMUNITY_COORDINATOR,
  ]);
  const operationalUsers = users.filter((user) => operationalRoles.has(normalizeRole(user.role)));
  const activeUsers = operationalUsers.filter((user) => String(user.status || 'Active').trim().toLowerCase() === 'active');
  const rolesRequiringAssignment = new Set([ROLES.HEALTH_WORKER, ROLES.COMMUNITY_COORDINATOR]);
  return {
    total: operationalUsers.length,
    active: activeUsers.length,
    suspended: operationalUsers.filter((user) => String(user.status || '').trim().toLowerCase() === 'suspended').length,
    unassigned: activeUsers.filter((user) => {
      const role = normalizeRole(user.role);
      return rolesRequiringAssignment.has(role)
        && (!(user.school_id ?? user.schoolId) || (role === ROLES.HEALTH_WORKER && !(user.group_id ?? user.groupId)));
    }).length,
  };
}

export function buildDashboardModuleSummaries({
  mothers = [],
  children = [],
  batches = [],
  selectedBatchId = '',
  programs = [],
  programsAvailable = true,
  staffMetrics = { active: 0, suspended: 0, unassigned: 0 },
  communityMetrics = { schools: 0, groups: 0 },
  reportMetrics = { signIns: 0, signInsLast30Days: 0 },
  notificationMetrics = { all: 0, unread: 0 },
  isSuperAdmin = false,
  isCommunityOrganizer = false,
  now = new Date(),
} = {}) {
  const beneficiaries = [...mothers, ...children];
  const checkedThisMonth = beneficiaries.filter((record) => hasCheckupThisMonth(record, now)).length;
  const incompleteBatchOptions = getIncompleteBatchProgressOptions(children, batches);
  const selectedBatchProgress = incompleteBatchOptions.find((batch) => batch.id === String(selectedBatchId))
    || incompleteBatchOptions[0]
    || null;
  const screeningMetrics = [
    { type: 'Mother', records: mothers },
    { type: 'Child', records: children },
  ].flatMap(({ type, records }) => [
    {
      label: `${type === 'Mother' ? 'Mothers' : 'Children'} needing follow-up`,
      value: records.filter((record) => getMonthlyDevelopmentalStatus(record) === 'needs follow up').length,
      to: getMonitoringScreeningRoute(type, 'Needs Follow-up'),
    },
    {
      label: `${type === 'Mother' ? 'Mothers' : 'Children'} at risk`,
      value: records.filter((record) => getMonthlyDevelopmentalStatus(record) === 'at risk').length,
      to: getMonitoringScreeningRoute(type, 'At Risk'),
    },
  ]);
  const activePrograms = programs.filter((program) => (
    String(program.status || 'Active').trim().toLowerCase() !== 'ended'
  ));
  const modules = isSuperAdmin
    ? [
      {
        key: 'users',
        title: 'User Management',
        to: '/user-management',
        metrics: [
          { label: 'Operational accounts', value: staffMetrics.total },
          { label: 'Active accounts', value: staffMetrics.active },
          { label: 'Suspended accounts', value: staffMetrics.suspended },
          { label: 'Active and unassigned', value: staffMetrics.unassigned },
        ],
        note: 'Superadmin account excluded; operational accounts only',
      },
      {
        key: 'community',
        title: 'Community',
        to: '/community',
        metrics: [
          { label: 'Schools', value: communityMetrics.schools },
          { label: 'Groups', value: communityMetrics.groups },
        ],
        note: 'Global school and group directory',
      },
      {
        key: 'reports',
        title: 'Reports',
        to: '/reports',
        metrics: [
          { label: 'Operational sign-ins', value: reportMetrics.signIns },
          { label: 'Sign-ins in the last 30 days', value: reportMetrics.signInsLast30Days },
        ],
        note: 'Superadmin activity is excluded from operational sign-in totals',
      },
      {
        key: 'notifications',
        title: 'Notifications',
        to: '/notifications',
        metrics: [
          { label: 'Unread', value: notificationMetrics.unread },
          { label: 'Available', value: notificationMetrics.all },
        ],
        note: 'Community and User Management categories only',
      },
    ]
    : [
      {
        key: 'monitoring',
        title: 'Monitoring',
        to: '/monitoring',
        metrics: [
          { label: 'Beneficiaries checked this month', value: checkedThisMonth },
          { label: 'No check-up recorded this month', value: beneficiaries.length - checkedThisMonth },
          ...screeningMetrics,
        ],
        note: 'Screening counts use the latest recorded result for each beneficiary. Select a count to view matching records.',
      },
      {
        key: 'batch-progress',
        title: 'Batch Progress',
        to: '/monitoring',
        batchOptions: incompleteBatchOptions,
        selectedBatchId: selectedBatchProgress?.id || '',
        metrics: [
          {
            label: selectedBatchProgress ? `${selectedBatchProgress.name} progress` : 'Incomplete batch progress',
            value: selectedBatchProgress ? `${selectedBatchProgress.percentage}%` : '—',
          },
        ],
        note: selectedBatchProgress
          ? `${selectedBatchProgress.completed} of ${selectedBatchProgress.total} children completed all 24 monitoring months`
          : 'All batches with child records have reached 100% progress',
      },
      {
        key: 'projects',
        title: 'Projects',
        to: '/program',
        metrics: [
          { label: 'Active projects', value: programsAvailable ? activePrograms.length : '—' },
          { label: 'Total projects', value: programsAvailable ? programs.length : '—' },
        ],
        note: 'Active projects exclude projects that have ended',
      },
      ...(isCommunityOrganizer ? [{
        key: 'users',
        title: 'User Management',
        to: '/user-management',
        metrics: [
          { label: 'Active health workers', value: staffMetrics.active },
          { label: 'Suspended health workers', value: staffMetrics.suspended },
        ],
        note: 'Health workers in your assigned school',
      }] : []),
    ];

  return modules;
}
