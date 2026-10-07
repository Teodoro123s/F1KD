import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import RoleMothersProvider from './context/RoleMothersProvider';
import RoleModulePage from './pages/RoleModulePage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import Login from './pages/Login';
import { useAuth } from './auth/AuthProvider';
import RoleBasedRoute from './components/RoleBasedRoute';
import { LoadingScreen } from './components/LoadingSkeleton';
import { MODULE_ROLES, PERMISSIONS, ROLES } from './utils/permissions';

const COMMUNITY_ROLES = MODULE_ROLES.community;
const BENEFICIARY_ROLES = MODULE_ROLES.beneficiary;
const PROGRAM_ROLES = MODULE_ROLES.program;
const PROGRESS_REPORT_ROLES = MODULE_ROLES.progressReport;
const BENEFICIARY_CREATE_ROLES = PERMISSIONS['beneficiary-resources'].create;
const BENEFICIARY_EDIT_ROLES = PERMISSIONS['beneficiary-resources'].update;

function RequireAuth({ children }) {
  const auth = useAuth();
  if (auth.loading) return <LoadingScreen message="Checking your session..." />;
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function InitialRoute() {
  const auth = useAuth();
  if (auth.loading) return <LoadingScreen message="Checking your session..." />;
  return <Navigate to={auth.isAuthenticated ? '/dashboard' : '/login'} replace />;
}

function GuestRoute({ children }) {
  const auth = useAuth();
  if (auth.loading) return <LoadingScreen message="Checking your session..." />;
  return auth.isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/" element={<InitialRoute />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
          <RoleMothersProvider>
            <Layout />
          </RoleMothersProvider>
        </RequireAuth>
      }
      >
        <Route path="dashboard" element={<RoleModulePage module="dashboard" />} />
        <Route path="community" element={<RoleBasedRoute allowedRoles={COMMUNITY_ROLES}><RoleModulePage module="community" /></RoleBasedRoute>} />
        <Route path="community/school/:schoolId" element={<RoleBasedRoute allowedRoles={COMMUNITY_ROLES}><RoleModulePage module="community" /></RoleBasedRoute>} />
        <Route path="community/group/:groupId" element={<RoleBasedRoute allowedRoles={COMMUNITY_ROLES}><RoleModulePage module="community" /></RoleBasedRoute>} />
        <Route path="community/group/:groupId/health-workers" element={<RoleBasedRoute allowedRoles={COMMUNITY_ROLES}><RoleModulePage module="community" /></RoleBasedRoute>} />
        <Route path="community/batch/:batchId" element={<RoleBasedRoute allowedRoles={COMMUNITY_ROLES}><RoleModulePage module="community" /></RoleBasedRoute>} />
        <Route path="beneficiary" element={<RoleBasedRoute allowedRoles={BENEFICIARY_ROLES}><RoleModulePage module="beneficiary" /></RoleBasedRoute>} />
        <Route path="beneficiary/mother/:id" element={<RoleBasedRoute allowedRoles={BENEFICIARY_ROLES}><RoleModulePage module="beneficiary" /></RoleBasedRoute>} />
        <Route path="beneficiary/mother/:id/profile" element={<RoleBasedRoute allowedRoles={BENEFICIARY_ROLES}><RoleModulePage module="beneficiary" /></RoleBasedRoute>} />
        <Route path="beneficiary/create/mother" element={<RoleBasedRoute allowedRoles={BENEFICIARY_CREATE_ROLES}><RoleModulePage module="beneficiary" /></RoleBasedRoute>} />
        <Route path="beneficiary/create/child" element={<RoleBasedRoute allowedRoles={BENEFICIARY_CREATE_ROLES}><RoleModulePage module="beneficiary" /></RoleBasedRoute>} />
        <Route path="beneficiary/mother/:id/child" element={<RoleBasedRoute allowedRoles={BENEFICIARY_ROLES}><RoleModulePage module="beneficiary" page="motherChildren" /></RoleBasedRoute>} />
        <Route path="beneficiary/child/:childId/profile" element={<RoleBasedRoute allowedRoles={BENEFICIARY_ROLES}><RoleModulePage module="beneficiary" page="childProfile" /></RoleBasedRoute>} />
        <Route path="beneficiary/child/:childId" element={<RoleBasedRoute allowedRoles={BENEFICIARY_ROLES}><RoleModulePage module="beneficiary" page="childProfile" /></RoleBasedRoute>} />
        <Route path="beneficiary/child/:childId/edit" element={<RoleBasedRoute allowedRoles={BENEFICIARY_EDIT_ROLES}><RoleModulePage module="beneficiary" page="editChild" /></RoleBasedRoute>} />
        <Route path="beneficiary/mother/:id/monitoring" element={<RoleBasedRoute allowedRoles={MODULE_ROLES.monitoring}><RoleModulePage module="monitoring" /></RoleBasedRoute>} />
        <Route path="beneficiary/mother/:id/edit" element={<RoleBasedRoute allowedRoles={BENEFICIARY_EDIT_ROLES}><RoleModulePage module="beneficiary" page="editMother" /></RoleBasedRoute>} />
        <Route path="monitoring" element={<RoleBasedRoute allowedRoles={MODULE_ROLES.monitoring}><RoleModulePage module="monitoring" /></RoleBasedRoute>} />
        <Route path="checkup" element={<RoleBasedRoute allowedRoles={MODULE_ROLES.monitoring}><RoleModulePage module="monitoring" /></RoleBasedRoute>} />
        <Route path="program" element={<RoleBasedRoute allowedRoles={PROGRAM_ROLES}><RoleModulePage module="program" /></RoleBasedRoute>} />
        <Route path="program/:programId/beneficiaries/:beneficiaryType/:beneficiaryId/receipt-history" element={<RoleBasedRoute allowedRoles={PROGRAM_ROLES}><RoleModulePage module="program" page="receiptHistory" /></RoleBasedRoute>} />
        <Route path="program/:programId/cluster/:clusterType/:clusterName/receipt-history" element={<RoleBasedRoute allowedRoles={PROGRAM_ROLES}><RoleModulePage module="program" page="receiptHistory" /></RoleBasedRoute>} />
        <Route path="program/:programId/school/:schoolId" element={<RoleBasedRoute allowedRoles={PROGRAM_ROLES}><RoleModulePage module="program" /></RoleBasedRoute>} />
        <Route path="program/:programId/group/:groupId" element={<RoleBasedRoute allowedRoles={PROGRAM_ROLES}><RoleModulePage module="program" /></RoleBasedRoute>} />
        <Route path="program/:programId/batch/:batchId" element={<RoleBasedRoute allowedRoles={PROGRAM_ROLES}><RoleModulePage module="program" /></RoleBasedRoute>} />
        <Route path="program/:programId" element={<RoleBasedRoute allowedRoles={PROGRAM_ROLES}><RoleModulePage module="program" /></RoleBasedRoute>} />
        <Route path="program/:programId/cluster/:clusterType/:clusterName" element={<RoleBasedRoute allowedRoles={PROGRAM_ROLES}><RoleModulePage module="program" /></RoleBasedRoute>} />
        <Route path="progress-report" element={<RoleBasedRoute allowedRoles={PROGRESS_REPORT_ROLES}><RoleModulePage module="progressReport" /></RoleBasedRoute>} />
        <Route path="user-management" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><RoleModulePage module="userManagement" /></RoleBasedRoute>} />
        <Route path="user-management/school/:schoolId" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><RoleModulePage module="userManagement" /></RoleBasedRoute>} />
        <Route path="user-management/batch/:batchId" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><RoleModulePage module="userManagement" /></RoleBasedRoute>} />
        <Route path="user-management/user/:id" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><RoleModulePage module="userManagement" page="userDetail" /></RoleBasedRoute>} />
        <Route path="notifications" element={<RoleBasedRoute allowedRoles={MODULE_ROLES.notifications}><RoleModulePage module="notifications" /></RoleBasedRoute>} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
