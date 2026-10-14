import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import CommunityPage from './CommunityPage';
import SuperAdminCommunityPage from './SuperAdminCommunityPage';
import SuperAdminHealthWorkersPage from './SuperAdminHealthWorkersPage';
import { useAuth } from '../../auth/AuthProvider';
import { hasRole, ROLES } from '../../utils/permissions';

/** Selects the isolated Community implementation for superadmins. */
export default function CommunityModulePage() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const { groupId } = useParams();

  if (!hasRole(currentUser?.role, [ROLES.SUPER_ADMIN])) return <CommunityPage />;
  if (groupId || location.pathname.endsWith('/health-workers')) return <SuperAdminHealthWorkersPage />;
  return <SuperAdminCommunityPage />;
}
