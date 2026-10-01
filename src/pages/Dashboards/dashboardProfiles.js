import { ROLES, normalizeRole } from '../../utils/permissions';

export const DASHBOARD_PROFILES = {
  [ROLES.SUPER_ADMIN]: {
    eyebrow: 'System command center',
    title: 'Municipal operations at a glance',
    description: 'Review access, communities, and system-wide readiness from one place.',
    modules: [
      { label: 'Community', path: '/community', description: 'Schools, groups, and batches' },
      { label: 'User Management', path: '/user-management', description: 'Accounts and assignments' },
    ],
    cards: [
      { key: 'communities', label: 'Schools', source: 'communities' },
      { key: 'users', label: 'User accounts', source: 'users' },
      { key: 'groups', label: 'Groups', source: 'groups' },
      { key: 'batches', label: 'Batches', source: 'batches' },
    ],
  },
  [ROLES.ADMIN]: {
    eyebrow: 'Operations dashboard',
    title: 'Keep field operations moving',
    description: 'Open the module that needs attention and stay close to delivery progress.',
    modules: [
      { label: 'Community', path: '/community', description: 'Review assigned communities' },
      { label: 'Beneficiaries', path: '/beneficiary', description: 'Browse beneficiary records' },
      { label: 'Monitoring', path: '/monitoring', description: 'Review check-up progress' },
      { label: 'Programs', path: '/program', description: 'Track program delivery' },
      { label: 'Notifications', path: '/notifications', description: 'Review operational alerts', priority: true },
      { label: 'Reports', path: '/progress-report', description: 'Generate progress reports', priority: true },
    ],
    cards: [
      { key: 'beneficiaries', label: 'Beneficiaries', source: 'beneficiaries' },
      { key: 'communities', label: 'Schools', source: 'communities' },
      { key: 'programs', label: 'Active programs', source: 'programs' },
      { key: 'followUp', label: 'Records needing follow-up', source: 'followUp' },
      { key: 'notifications', label: 'Notifications', source: 'notifications' },
    ],
  },
  [ROLES.PARTNER]: {
    eyebrow: 'Partner workspace',
    title: 'See the work connected to your partnership',
    description: 'Move from community context to beneficiary and program updates quickly.',
    modules: [
      { label: 'Community', path: '/community', description: 'View community context' },
      { label: 'Beneficiaries', path: '/beneficiary', description: 'View beneficiary records' },
      { label: 'Programs', path: '/program', description: 'Review program delivery' },
      { label: 'Notifications', path: '/notifications', description: 'Review partnership alerts', priority: true },
      { label: 'Reports', path: '/progress-report', description: 'Review progress reports', priority: true },
    ],
    cards: [
      { key: 'beneficiaries', label: 'Beneficiaries', source: 'beneficiaries' },
      { key: 'programs', label: 'Active programs', source: 'programs' },
      { key: 'communities', label: 'Schools', source: 'communities' },
      { key: 'followUp', label: 'Follow-up records', source: 'followUp' },
      { key: 'notifications', label: 'Notifications', source: 'notifications' },
    ],
  },
  [ROLES.COMMUNITY_COORDINATOR]: {
    eyebrow: 'Field operations dashboard',
    title: 'Coordinate today\'s field work',
    description: 'Register, monitor, and organize the communities assigned to your team.',
    modules: [
      { label: 'Community', path: '/community', description: 'Manage schools and groups' },
      { label: 'Beneficiaries', path: '/beneficiary', description: 'Register and update records' },
      { label: 'Monitoring', path: '/monitoring', description: 'Record check-ups' },
      { label: 'Programs', path: '/program', description: 'Manage program delivery' },
      { label: 'Notifications', path: '/notifications', description: 'Review field alerts', priority: true },
      { label: 'Reports', path: '/progress-report', description: 'Build progress reports', priority: true },
    ],
    cards: [
      { key: 'beneficiaries', label: 'Beneficiaries', source: 'beneficiaries' },
      { key: 'followUp', label: 'Follow-up records', source: 'followUp' },
      { key: 'programs', label: 'Active programs', source: 'programs' },
      { key: 'communities', label: 'Schools', source: 'communities' },
      { key: 'notifications', label: 'Notifications', source: 'notifications' },
    ],
  },
  [ROLES.HEALTH_WORKER]: {
    eyebrow: 'Care delivery dashboard',
    title: 'Prioritize the next check-up',
    description: 'Open assigned beneficiary records and keep monitoring work focused.',
    modules: [
      { label: 'Beneficiaries', path: '/beneficiary', description: 'Review assigned records' },
      { label: 'Monitoring', path: '/monitoring', description: 'Record check-ups' },
      { label: 'Community', path: '/community', description: 'View assigned group' },
      { label: 'Notifications', path: '/notifications', description: 'Review care alerts', priority: true },
      { label: 'Reports', path: '/progress-report', description: 'Review growth reports', priority: true },
    ],
    cards: [
      { key: 'beneficiaries', label: 'Assigned beneficiaries', source: 'beneficiaries' },
      { key: 'followUp', label: 'Follow-up records', source: 'followUp' },
      { key: 'children', label: 'Children', source: 'children' },
      { key: 'communities', label: 'Assigned schools', source: 'communities' },
      { key: 'notifications', label: 'Notifications', source: 'notifications' },
    ],
  },
};

export function getDashboardProfile(role) {
  return DASHBOARD_PROFILES[normalizeRole(role)] || DASHBOARD_PROFILES[ROLES.PARTNER];
}