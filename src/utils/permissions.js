export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PARTNER: 'partner',
};

export const PERMISSIONS = {
  'user-management': { read: [ROLES.SUPER_ADMIN], create: [ROLES.SUPER_ADMIN], update: [ROLES.SUPER_ADMIN], delete: [ROLES.SUPER_ADMIN] },
  'admin-resources': { read: [ROLES.SUPER_ADMIN, ROLES.ADMIN], create: [ROLES.SUPER_ADMIN], update: [ROLES.SUPER_ADMIN], delete: [ROLES.SUPER_ADMIN] },
  'partner-resources': { read: [ROLES.SUPER_ADMIN, ROLES.PARTNER], create: [ROLES.SUPER_ADMIN], update: [ROLES.SUPER_ADMIN], delete: [ROLES.SUPER_ADMIN] },
};

const ROLE_ALIASES = {
  superadmin: ROLES.SUPER_ADMIN,
  'super admin': ROLES.SUPER_ADMIN,
  administrator: ROLES.ADMIN,
  admin: ROLES.ADMIN,
  'community organizer': ROLES.PARTNER,
  communityorganizer: ROLES.PARTNER,
  partner: ROLES.PARTNER,
  'health worker': ROLES.PARTNER,
  healthworker: ROLES.PARTNER,
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