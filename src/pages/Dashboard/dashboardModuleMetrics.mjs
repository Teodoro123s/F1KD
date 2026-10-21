import { hasCheckupThisMonth } from '../../utils/monthlyCheckups.js';
import { normalizeRole, ROLES } from '../../utils/permissions.js';

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

function hasMonitoringRecord(record) {
  return Array.isArray(record.checkups) && record.checkups.flat(Infinity).some(Boolean);
}

export function buildDashboardModuleSummaries({
  mothers = [],
  children = [],
  programs = [],
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
  const recordsWithMonitoring = beneficiaries.filter(hasMonitoringRecord).length;
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
        key: 'beneficiaries',
        title: 'Beneficiaries',
        to: '/beneficiary',
        metrics: [
          { label: 'Total profiles', value: beneficiaries.length },
          { label: 'Mothers', value: mothers.length },
          { label: 'Children', value: children.length },
        ],
        note: 'Current scoped records',
      },
      {
        key: 'monitoring',
        title: 'Monitoring',
        to: '/monitoring',
        metrics: [
          { label: 'Beneficiaries checked this month', value: checkedThisMonth },
          { label: 'No check-up recorded this month', value: beneficiaries.length - checkedThisMonth },
        ],
        note: 'Based on saved beneficiary check-ups',
      },
      {
        key: 'programs',
        title: 'Programs',
        to: '/program',
        metrics: [
          { label: 'Active programs', value: activePrograms.length },
          {
            label: 'Recorded reach / target',
            value: `${activePrograms.reduce((total, program) => total + (Number(program.received) || 0), 0).toLocaleString()} / ${activePrograms.reduce((total, program) => total + (Number(program.target) || 0), 0).toLocaleString()}`,
          },
        ],
        note: 'Reach uses saved program check-ins',
      },
      {
        key: 'progress',
        title: 'Progress Report',
        to: '/progress-report',
        metrics: [
          { label: 'Profiles with check-up history', value: recordsWithMonitoring },
          { label: 'Reportable profiles', value: beneficiaries.length },
          {
            label: 'Monitoring data coverage',
            value: `${beneficiaries.length ? Math.round((recordsWithMonitoring / beneficiaries.length) * 100) : 0}%`,
          },
        ],
        note: 'Reports are generated from current records',
      },
      ...(isCommunityOrganizer ? [{
        key: 'users',
        title: 'User Management',
        to: '/user-management',
        metrics: [{ label: 'Active health workers', value: staffMetrics.active }],
        note: 'Health workers in your assigned school',
      }] : []),
    ];

  return modules;
}
