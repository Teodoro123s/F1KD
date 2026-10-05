import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { MothersProvider } from './context/MothersContext';
import CommunityModulePage from './pages/Community/CommunityModulePage';
import Beneficiary from './pages/Beneficiary/BeneficiaryPage';
import MonitoringPage from './pages/Monitoring/MonitoringPage';
import ChildProfilePage from './pages/Beneficiary/child/ChildProfilePage';
import EditChildPage from './pages/Beneficiary/child/EditChildPage';
import MotherChildrenPage from './pages/Beneficiary/child/MotherChildrenPage';
import EditMotherPage from './pages/Beneficiary/mother/EditMotherPage';
import Program from './pages/Program';
import ProgressReport from './pages/ProgressReport/ProgressReport';
import ReceiptHistoryPage from './pages/Program/ReceiptHistoryPage';
import UserManagementPage from './pages/UserManagement/UserManagementPage';
import UserDetailPage from './pages/UserManagement/UserDetailPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/Notifications/NotificationsPage';
import DashboardsPage from './pages/Dashboards/DashboardsPage';
import Login from './pages/Login';
import { useAuth } from './auth/AuthProvider';
import RoleBasedRoute from './components/RoleBasedRoute';
import { LoadingScreen } from './components/LoadingSkeleton';
import { ROLES } from './utils/permissions';

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
const PROGRESS_REPORT_ROLES = [ROLES.ADMIN, ROLES.COMMUNITY_COORDINATOR, ROLES.PARTNER, ROLES.HEALTH_WORKER];
const BENEFICIARY_CREATE_ROLES = [ROLES.COMMUNITY_COORDINATOR];
const BENEFICIARY_EDIT_ROLES = [ROLES.COMMUNITY_COORDINATOR, ROLES.HEALTH_WORKER];

function RequireAuth({ children }) {
  const auth = useAuth();
  if (auth.loading) return <LoadingScreen message="Checking your session..." />;
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Login />} />
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
        <Route path="community" element={<RoleBasedRoute allowedRoles={COMMUNITY_ROLES}><CommunityModulePage /></RoleBasedRoute>} />
        <Route path="dashboard" element={<RoleBasedRoute allowedRoles={[...COMMUNITY_ROLES, ...OPERATIONAL_ROLES]}><DashboardsPage /></RoleBasedRoute>} />
        <Route path="community/school/:schoolId" element={<RoleBasedRoute allowedRoles={COMMUNITY_ROLES}><CommunityModulePage /></RoleBasedRoute>} />
        <Route path="community/group/:groupId" element={<RoleBasedRoute allowedRoles={COMMUNITY_ROLES}><CommunityModulePage /></RoleBasedRoute>} />
        <Route path="community/group/:groupId/health-workers" element={<RoleBasedRoute allowedRoles={COMMUNITY_ROLES}><CommunityModulePage /></RoleBasedRoute>} />
        <Route path="community/batch/:batchId" element={<RoleBasedRoute allowedRoles={COMMUNITY_ROLES}><CommunityModulePage /></RoleBasedRoute>} />
        <Route path="beneficiary" element={<RoleBasedRoute allowedRoles={OPERATIONAL_ROLES}><Beneficiary /></RoleBasedRoute>} />
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
        <Route path="user-management" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><UserManagementPage /></RoleBasedRoute>} />
        <Route path="user-management/school/:schoolId" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><UserManagementPage /></RoleBasedRoute>} />
        <Route path="user-management/batch/:batchId" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><UserManagementPage /></RoleBasedRoute>} />
        <Route path="user-management/user/:id" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><UserDetailPage /></RoleBasedRoute>} />
        <Route path="notifications" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.COMMUNITY_COORDINATOR, ROLES.PARTNER, ROLES.HEALTH_WORKER]}><NotificationsPage /></RoleBasedRoute>} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/community" replace />} />
      </Route>
    </Routes>
  );
}
