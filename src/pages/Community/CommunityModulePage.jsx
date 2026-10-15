import React from 'react';
import CommunityPage from './CommunityPage';
import SuperAdminCommunityPage from './SuperAdminCommunityPage';
import { useAuth } from '../../auth/AuthProvider';
import { hasRole, ROLES } from '../../utils/permissions';

/** Selects the isolated Community implementation for superadmins. */
export default function CommunityModulePage() {
  const { currentUser } = useAuth();

  if (!hasRole(currentUser?.role, [ROLES.SUPER_ADMIN])) return <CommunityPage />;
  return <SuperAdminCommunityPage />;
}
