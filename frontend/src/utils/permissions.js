export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  COMMUNITY_COORDINATOR: 'community_coordinator',
  PARTNER: 'partner',
  HEALTH_WORKER: 'health_worker',
};

const COORDINATOR = [ROLES.COMMUNITY_COORDINATOR];
const SUPER_ADMIN = [ROLES.SUPER_ADMIN];
export const MODULE_ROLES = {
  dashboard: Object.values(ROLES),
  community: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COMMUNITY_COORDINATOR],
  beneficiary: [ROLES.ADMIN, ROLES.COMMUNITY_COORDINATOR, ROLES.HEALTH_WORKER],
  monitoring: [ROLES.ADMIN, ROLES.COMMUNITY_COORDINATOR, ROLES.HEALTH_WORKER],
  notifications: Object.values(ROLES),
  program: [ROLES.ADMIN, ROLES.COMMUNITY_COORDINATOR, ROLES.PARTNER],
  progressReport: [ROLES.COMMUNITY_COORDINATOR, ROLES.PARTNER],
  userManagement: SUPER_ADMIN,
};

export const PERMISSIONS = {
  'user-management': {
    read: SUPER_ADMIN,
    create: SUPER_ADMIN,
    update: SUPER_ADMIN,
    delete: SUPER_ADMIN,
  },
  'community-resources': {
    read: MODULE_ROLES.community,
    create: [ROLES.SUPER_ADMIN, ROLES.COMMUNITY_COORDINATOR],
    update: [ROLES.SUPER_ADMIN, ROLES.COMMUNITY_COORDINATOR],
    delete: [ROLES.SUPER_ADMIN, ROLES.COMMUNITY_COORDINATOR],
  },
  'admin-resources': {
    read: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    create: SUPER_ADMIN,
    update: SUPER_ADMIN,
    delete: SUPER_ADMIN,
  },
  'partner-resources': {
    read: [ROLES.SUPER_ADMIN, ROLES.COMMUNITY_COORDINATOR, ROLES.PARTNER],
    create: COORDINATOR,
    update: COORDINATOR,
    delete: COORDINATOR,
  },
  'beneficiary-resources': {
    read: MODULE_ROLES.beneficiary,
    create: [ROLES.COMMUNITY_COORDINATOR],
    update: [ROLES.COMMUNITY_COORDINATOR, ROLES.HEALTH_WORKER],
    delete: [ROLES.COMMUNITY_COORDINATOR],
  },
  'program-resources': {
    read: MODULE_ROLES.program,
    create: COORDINATOR,
    update: COORDINATOR,
    delete: COORDINATOR,
  },
  'monitor-resources': {
    read: MODULE_ROLES.monitoring,
    create: [ROLES.COMMUNITY_COORDINATOR, ROLES.HEALTH_WORKER],
    update: [ROLES.COMMUNITY_COORDINATOR, ROLES.HEALTH_WORKER],
    delete: [ROLES.COMMUNITY_COORDINATOR],
  },
  'progress-report': {
    read: MODULE_ROLES.progressReport,
  },
};

const ROLE_ALIASES = {
  superadmin: ROLES.SUPER_ADMIN,
  'super admin': ROLES.SUPER_ADMIN,
  super_admin: ROLES.SUPER_ADMIN,
  administrator: ROLES.ADMIN,
  admin: ROLES.ADMIN,
  'community organizer': ROLES.COMMUNITY_COORDINATOR,
  communityorganizer: ROLES.COMMUNITY_COORDINATOR,
  'community coordinator': ROLES.COMMUNITY_COORDINATOR,
  community_coordinator: ROLES.COMMUNITY_COORDINATOR,
  communitycoordinator: ROLES.COMMUNITY_COORDINATOR,
  coordinator: ROLES.COMMUNITY_COORDINATOR,
  co: ROLES.COMMUNITY_COORDINATOR,
  partner: ROLES.PARTNER,
  'health worker': ROLES.HEALTH_WORKER,
  healthworker: ROLES.HEALTH_WORKER,
  health_worker: ROLES.HEALTH_WORKER,
};

export function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  return ROLE_ALIASES[value] || value;
}

export function hasRole(userRole, allowedRoles = []) {
  const role = normalizeRole(userRole);
  return allowedRoles.some((allowedRole) => normalizeRole(allowedRole) === role);
}

export function can(userRole, resource, action) {
  return hasRole(userRole, PERMISSIONS[resource]?.[action] || []);
}

export function canAccessModule(userRole, module) {
  return hasRole(userRole, MODULE_ROLES[module] || []);
}

export function isHealthWorkerRole(role) {
  return normalizeRole(role) === ROLES.HEALTH_WORKER;
}

export function isCommunityCoordinatorRole(role) {
  return normalizeRole(role) === ROLES.COMMUNITY_COORDINATOR;
}

export function isSchoolScopedRole(role) {
  const normalizedRole = normalizeRole(role);
  return [
    ROLES.ADMIN,
    ROLES.COMMUNITY_COORDINATOR,
    ROLES.PARTNER,
    ROLES.HEALTH_WORKER,
  ].includes(normalizedRole);
}
