import { lazy, Suspense } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { LoadingScreen } from '../components/LoadingSkeleton';
import { normalizeRole, ROLES } from '../utils/permissions';

const providersByRole = {
  [ROLES.SUPER_ADMIN]: lazy(() => import('../pages/roles/super_admin/_shared/context/MothersContext').then((module) => ({ default: module.MothersProvider }))),
  [ROLES.ADMIN]: lazy(() => import('../pages/roles/admin/_shared/context/MothersContext').then((module) => ({ default: module.MothersProvider }))),
  [ROLES.COMMUNITY_COORDINATOR]: lazy(() => import('../pages/roles/community_coordinator/_shared/context/MothersContext').then((module) => ({ default: module.MothersProvider }))),
  [ROLES.PARTNER]: lazy(() => import('../pages/roles/partner/_shared/context/MothersContext').then((module) => ({ default: module.MothersProvider }))),
  [ROLES.HEALTH_WORKER]: lazy(() => import('../pages/roles/health_worker/_shared/context/MothersContext').then((module) => ({ default: module.MothersProvider }))),
};

export default function RoleMothersProvider({ children }) {
  const { currentUser } = useAuth();
  const Provider = providersByRole[normalizeRole(currentUser?.role)];

  if (!Provider) return children;

  return (
    <Suspense fallback={<LoadingScreen message="Loading your workspace..." />}>
      <Provider>{children}</Provider>
    </Suspense>
  );
}
