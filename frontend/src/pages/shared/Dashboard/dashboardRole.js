import { normalizeRole, ROLES } from '../../../utils/permissions.js';

const supportedDashboardRoles = new Set(Object.values(ROLES));

export function getDashboardRole(role) {
  const normalizedRole = normalizeRole(role);
  return supportedDashboardRoles.has(normalizedRole) ? normalizedRole : null;
}
