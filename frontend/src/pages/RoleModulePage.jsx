import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { PageSkeleton } from '../components/LoadingSkeleton';
import { normalizeRole, ROLES } from '../utils/permissions';

const modulePages = {
  dashboard: {
    [ROLES.SUPER_ADMIN]: lazy(() => import('./roles/super_admin/Dashboard')),
    [ROLES.ADMIN]: lazy(() => import('./roles/admin/Dashboard')),
    [ROLES.COMMUNITY_COORDINATOR]: lazy(() => import('./roles/community_coordinator/Dashboard')),
    [ROLES.PARTNER]: lazy(() => import('./roles/partner/Dashboard')),
    [ROLES.HEALTH_WORKER]: lazy(() => import('./roles/health_worker/Dashboard')),
  },
  community: {
    [ROLES.SUPER_ADMIN]: lazy(() => import('./roles/super_admin/Community')),
    [ROLES.ADMIN]: lazy(() => import('./roles/admin/Community')),
    [ROLES.COMMUNITY_COORDINATOR]: lazy(() => import('./roles/community_coordinator/Community')),
  },
  beneficiary: {
    [ROLES.SUPER_ADMIN]: lazy(() => import('./roles/super_admin/Beneficiary')),
    [ROLES.ADMIN]: lazy(() => import('./roles/admin/Beneficiary')),
    [ROLES.COMMUNITY_COORDINATOR]: lazy(() => import('./roles/community_coordinator/Beneficiary')),
    [ROLES.HEALTH_WORKER]: lazy(() => import('./roles/health_worker/Beneficiary')),
  },
  monitoring: {
    [ROLES.SUPER_ADMIN]: lazy(() => import('./roles/super_admin/Monitoring')),
    [ROLES.ADMIN]: lazy(() => import('./roles/admin/Monitoring')),
    [ROLES.COMMUNITY_COORDINATOR]: lazy(() => import('./roles/community_coordinator/Monitoring')),
    [ROLES.HEALTH_WORKER]: lazy(() => import('./roles/health_worker/Monitoring')),
  },
  notifications: {
    [ROLES.SUPER_ADMIN]: lazy(() => import('./roles/super_admin/Notifications')),
    [ROLES.ADMIN]: lazy(() => import('./roles/admin/Notifications')),
    [ROLES.COMMUNITY_COORDINATOR]: lazy(() => import('./roles/community_coordinator/Notifications')),
    [ROLES.PARTNER]: lazy(() => import('./roles/partner/Notifications')),
    [ROLES.HEALTH_WORKER]: lazy(() => import('./roles/health_worker/Notifications')),
  },
  program: {
    [ROLES.SUPER_ADMIN]: lazy(() => import('./roles/super_admin/Program')),
    [ROLES.ADMIN]: lazy(() => import('./roles/admin/Program')),
    [ROLES.PARTNER]: lazy(() => import('./roles/partner/Program')),
  },
  progressReport: {
    [ROLES.SUPER_ADMIN]: lazy(() => import('./roles/super_admin/ProgressReport')),
    [ROLES.COMMUNITY_COORDINATOR]: lazy(() => import('./roles/community_coordinator/ProgressReport')),
    [ROLES.PARTNER]: lazy(() => import('./roles/partner/ProgressReport')),
  },
  userManagement: {
    [ROLES.SUPER_ADMIN]: lazy(() => import('./roles/super_admin/UserManagement')),
  },
};

const moduleDetailPages = {
  beneficiary: {
    childProfile: {
      [ROLES.SUPER_ADMIN]: lazy(() => import('./roles/super_admin/Beneficiary').then((pages) => ({ default: pages.ChildProfilePage }))),
      [ROLES.ADMIN]: lazy(() => import('./roles/admin/Beneficiary').then((pages) => ({ default: pages.ChildProfilePage }))),
      [ROLES.COMMUNITY_COORDINATOR]: lazy(() => import('./roles/community_coordinator/Beneficiary').then((pages) => ({ default: pages.ChildProfilePage }))),
      [ROLES.HEALTH_WORKER]: lazy(() => import('./roles/health_worker/Beneficiary').then((pages) => ({ default: pages.ChildProfilePage }))),
    },
    editChild: {
      [ROLES.SUPER_ADMIN]: lazy(() => import('./roles/super_admin/Beneficiary').then((pages) => ({ default: pages.EditChildPage }))),
      [ROLES.ADMIN]: lazy(() => import('./roles/admin/Beneficiary').then((pages) => ({ default: pages.EditChildPage }))),
      [ROLES.COMMUNITY_COORDINATOR]: lazy(() => import('./roles/community_coordinator/Beneficiary').then((pages) => ({ default: pages.EditChildPage }))),
      [ROLES.HEALTH_WORKER]: lazy(() => import('./roles/health_worker/Beneficiary').then((pages) => ({ default: pages.EditChildPage }))),
    },
    motherChildren: {
      [ROLES.SUPER_ADMIN]: lazy(() => import('./roles/super_admin/Beneficiary').then((pages) => ({ default: pages.MotherChildrenPage }))),
      [ROLES.ADMIN]: lazy(() => import('./roles/admin/Beneficiary').then((pages) => ({ default: pages.MotherChildrenPage }))),
      [ROLES.COMMUNITY_COORDINATOR]: lazy(() => import('./roles/community_coordinator/Beneficiary').then((pages) => ({ default: pages.MotherChildrenPage }))),
      [ROLES.HEALTH_WORKER]: lazy(() => import('./roles/health_worker/Beneficiary').then((pages) => ({ default: pages.MotherChildrenPage }))),
    },
    editMother: {
      [ROLES.SUPER_ADMIN]: lazy(() => import('./roles/super_admin/Beneficiary').then((pages) => ({ default: pages.EditMotherPage }))),
      [ROLES.ADMIN]: lazy(() => import('./roles/admin/Beneficiary').then((pages) => ({ default: pages.EditMotherPage }))),
      [ROLES.COMMUNITY_COORDINATOR]: lazy(() => import('./roles/community_coordinator/Beneficiary').then((pages) => ({ default: pages.EditMotherPage }))),
      [ROLES.HEALTH_WORKER]: lazy(() => import('./roles/health_worker/Beneficiary').then((pages) => ({ default: pages.EditMotherPage }))),
    },
  },
  program: {
    receiptHistory: {
      [ROLES.SUPER_ADMIN]: lazy(() => import('./roles/super_admin/Program').then((pages) => ({ default: pages.ReceiptHistoryPage }))),
      [ROLES.ADMIN]: lazy(() => import('./roles/admin/Program').then((pages) => ({ default: pages.ReceiptHistoryPage }))),
      [ROLES.PARTNER]: lazy(() => import('./roles/partner/Program').then((pages) => ({ default: pages.ReceiptHistoryPage }))),
    },
  },
  userManagement: {
    userDetail: {
      [ROLES.SUPER_ADMIN]: lazy(() => import('./roles/super_admin/UserManagement').then((pages) => ({ default: pages.UserDetailPage }))),
    },
  },
};

export default function RoleModulePage({ module, page }) {
  const { currentUser } = useAuth();
  const role = normalizeRole(currentUser?.role);
  const ModulePage = page
    ? moduleDetailPages[module]?.[page]?.[role]
    : modulePages[module]?.[role];

  if (!ModulePage) return <Navigate to="/dashboard" replace />;

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModulePage />
    </Suspense>
  );
}
