import React from 'react';
import { useAuth } from '../../../auth/AuthProvider';
import { ROLES } from '../../../utils/permissions';
import { getDashboardRole } from './dashboardRole';
import {
  AdminDashboard,
  CommunityCoordinatorDashboard,
  HealthWorkerDashboard,
  PartnerDashboard,
  SuperAdminDashboard,
} from '../../roles';
import UnsupportedRoleDashboard from './roles/UnsupportedRoleDashboard/UnsupportedRoleDashboard';

const dashboardsByRole = {
  [ROLES.SUPER_ADMIN]: SuperAdminDashboard,
  [ROLES.ADMIN]: AdminDashboard,
  [ROLES.COMMUNITY_COORDINATOR]: CommunityCoordinatorDashboard,
  [ROLES.PARTNER]: PartnerDashboard,
  [ROLES.HEALTH_WORKER]: HealthWorkerDashboard,
};

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const role = getDashboardRole(currentUser?.role);
  const RoleDashboard = dashboardsByRole[role] || UnsupportedRoleDashboard;

  return <RoleDashboard />;
}
