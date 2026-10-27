import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MothersProvider } from './context/MothersContext';
import Login from './pages/Auth/LoginPage';
import { useAuth } from './auth/AuthProvider';
import RoleBasedRoute from './components/RoleBasedRoute';
import { LoadingScreen } from './components/LoadingSkeleton';
import { ROLES } from './utils/permissions';
import UserConsentModal from './components/UserConsentModal';

const Layout = lazy(() => import('./components/Layout'));
const CommunityModulePage = lazy(() => import('./pages/Community/CommunityModulePage'));
const Beneficiary = lazy(() => import('./pages/Beneficiary/BeneficiaryPage'));
const MonitoringPage = lazy(() => import('./pages/Monitoring/MonitoringPage'));
const ChildProfilePage = lazy(() => import('./pages/Beneficiary/child/ChildProfilePage'));
const EditChildPage = lazy(() => import('./pages/Beneficiary/child/EditChildPage'));
const MotherChildrenPage = lazy(() => import('./pages/Beneficiary/child/MotherChildrenPage'));
const EditMotherPage = lazy(() => import('./pages/Beneficiary/mother/EditMotherPage'));
const Program = lazy(() => import('./pages/Program/ProgramPage'));
const ProgressReport = lazy(() => import('./pages/ProgressReport/ProgressReport'));
const ReceiptHistoryPage = lazy(() => import('./pages/Program/ReceiptHistoryPage'));
const BeneficiaryProgramReportPage = lazy(() => import('./pages/Program/BeneficiaryProgramReportPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagement/UserManagementPage'));
const UserDetailPage = lazy(() => import('./pages/UserManagement/UserDetailPage'));
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage'));
const NotificationsPage = lazy(() => import('./pages/Notifications/NotificationsPage'));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const ReportsPage = lazy(() => import('./pages/Reports/ReportsPage'));

const COMMUNITY_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.COMMUNITY_COORDINATOR,
  ROLES.PARTNER,
  ROLES.HEALTH_WORKER,
];
const OPERATIONAL_ROLES = [
  ROLES.ADMIN,
  ROLES.COMMUNITY_COORDINATOR,
  ROLES.PARTNER,
  ROLES.HEALTH_WORKER,
];
const DASHBOARD_ROLES = [ROLES.SUPER_ADMIN, ...OPERATIONAL_ROLES];
const PROGRESS_REPORT_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COMMUNITY_COORDINATOR, ROLES.PARTNER, ROLES.HEALTH_WORKER];
const BENEFICIARY_CREATE_ROLES = [ROLES.COMMUNITY_COORDINATOR];
const BENEFICIARY_EDIT_ROLES = [ROLES.COMMUNITY_COORDINATOR, ROLES.HEALTH_WORKER];

function RequireAuth({ children }) {
  const auth = useAuth();
  if (auth.loading) return <LoadingScreen message="Checking your session..." />;
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!auth.currentUser?.has_accepted_terms) {
    return null;
  }
  return children;
}

export default function App() {
  const auth = useAuth();
  return (
    <>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={auth.loading ? <LoadingScreen message="Checking your session..." /> : <Navigate to={auth.isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
          <MothersProvider>
            <Layout />
          </MothersProvider>
        </RequireAuth>
      }
      >
        <Route path="dashboard" element={<RoleBasedRoute allowedRoles={DASHBOARD_ROLES}><DashboardPage /></RoleBasedRoute>} />
        <Route path="community" element={<RoleBasedRoute allowedRoles={COMMUNITY_ROLES}><CommunityModulePage /></RoleBasedRoute>} />
        <Route path="community/school/:schoolId" element={<RoleBasedRoute allowedRoles={COMMUNITY_ROLES}><CommunityModulePage /></RoleBasedRoute>} />
        <Route path="community/group/:groupId" element={<RoleBasedRoute allowedRoles={COMMUNITY_ROLES}><CommunityModulePage /></RoleBasedRoute>} />
        <Route path="community/group/:groupId/health-workers" element={<RoleBasedRoute allowedRoles={COMMUNITY_ROLES}><CommunityModulePage /></RoleBasedRoute>} />
        <Route path="community/batch/:batchId" element={<RoleBasedRoute allowedRoles={COMMUNITY_ROLES}><CommunityModulePage /></RoleBasedRoute>} />
        <Route path="beneficiary" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><Beneficiary /></RoleBasedRoute>} />
        <Route path="beneficiary/mother/:id/program-report" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><BeneficiaryProgramReportPage beneficiaryType="mother" /></RoleBasedRoute>} />
        <Route path="beneficiary/child/:childId/program-report" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><BeneficiaryProgramReportPage beneficiaryType="child" /></RoleBasedRoute>} />
        <Route path="beneficiary/mother/:id" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><Beneficiary /></RoleBasedRoute>} />
        <Route path="beneficiary/mother/:id/profile" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><Beneficiary /></RoleBasedRoute>} />
        <Route path="beneficiary/create/mother" element={<RoleBasedRoute allowedRoles={BENEFICIARY_CREATE_ROLES}><Beneficiary /></RoleBasedRoute>} />
        <Route path="beneficiary/create/child" element={<RoleBasedRoute allowedRoles={BENEFICIARY_CREATE_ROLES}><Beneficiary /></RoleBasedRoute>} />
        <Route path="beneficiary/mother/:id/child" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><MotherChildrenPage /></RoleBasedRoute>} />
        <Route path="beneficiary/child/:childId/profile" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><ChildProfilePage /></RoleBasedRoute>} />
        <Route path="beneficiary/child/:childId" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><ChildProfilePage /></RoleBasedRoute>} />
        <Route path="beneficiary/child/:childId/edit" element={<RoleBasedRoute allowedRoles={BENEFICIARY_EDIT_ROLES}><EditChildPage /></RoleBasedRoute>} />
        <Route path="beneficiary/mother/:id/monitoring" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><MonitoringPage /></RoleBasedRoute>} />
        <Route path="beneficiary/mother/:id/edit" element={<RoleBasedRoute allowedRoles={BENEFICIARY_EDIT_ROLES}><EditMotherPage /></RoleBasedRoute>} />
        <Route path="monitoring" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><MonitoringPage /></RoleBasedRoute>} />
        <Route path="checkup" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><MonitoringPage /></RoleBasedRoute>} />
        <Route path="program" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><Program /></RoleBasedRoute>} />
        <Route path="program/:programId/beneficiaries/:beneficiaryType/:beneficiaryId/receipt-history" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><ReceiptHistoryPage /></RoleBasedRoute>} />
        <Route path="program/:programId/cluster/:clusterType/:clusterName/receipt-history" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><ReceiptHistoryPage /></RoleBasedRoute>} />
        <Route path="program/:programId/school/:schoolId" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><Program /></RoleBasedRoute>} />
        <Route path="program/:programId/group/:groupId" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><Program /></RoleBasedRoute>} />
        <Route path="program/:programId/batch/:batchId" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><Program /></RoleBasedRoute>} />
        <Route path="program/:programId" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><Program /></RoleBasedRoute>} />
        <Route path="program/:programId/cluster/:clusterType/:clusterName" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><Program /></RoleBasedRoute>} />
        <Route path="progress-report" element={<RoleBasedRoute allowedRoles={PROGRESS_REPORT_ROLES}><ProgressReport /></RoleBasedRoute>} />
        <Route path="user-management/health-workers" element={<RoleBasedRoute allowedRoles={[ROLES.COMMUNITY_COORDINATOR]}><UserManagementPage /></RoleBasedRoute>} />
        <Route path="user-management" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.COMMUNITY_COORDINATOR]}><UserManagementPage /></RoleBasedRoute>} />
        <Route path="user-management/school/:schoolId" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><UserManagementPage /></RoleBasedRoute>} />
        <Route path="user-management/batch/:batchId" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><UserManagementPage /></RoleBasedRoute>} />
        <Route path="user-management/user/:id" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.COMMUNITY_COORDINATOR]}><UserDetailPage /></RoleBasedRoute>} />
        <Route path="reports" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><ReportsPage /></RoleBasedRoute>} />
        <Route path="notifications" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COMMUNITY_COORDINATOR, ROLES.PARTNER, ROLES.HEALTH_WORKER]}><NotificationsPage /></RoleBasedRoute>} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/community" replace />} />
      </Route>
    </Routes>
    {auth.isAuthenticated && !auth.currentUser?.has_accepted_terms && <UserConsentModal />}
    </>
  );
}
