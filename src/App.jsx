import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { MothersProvider } from './context/MothersContext';
import DashboardPage from './pages/Dashboard/DashboardPage';
import CommunityPage from './pages/Community/CommunityPage';
import Beneficiary from './pages/Beneficiary/BeneficiaryPage';
import MonitoringPage from './pages/Monitoring/MonitoringPage';
import ChildProfilePage from './pages/Beneficiary/child/ChildProfilePage';
import EditChildPage from './pages/Beneficiary/child/EditChildPage';
import MotherChildrenPage from './pages/Beneficiary/child/MotherChildrenPage';
import EditMotherPage from './pages/Beneficiary/mother/EditMotherPage';
import Program from './pages/Program';
import ProgressReport from './pages/ProgressReport/ProgressReport';
import UserManagementPage from './pages/UserManagement/UserManagementPage';
import UserDetailPage from './pages/UserManagement/UserDetailPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import Login from './pages/Login';
import { useAuth } from './auth/AuthProvider';
import RoleBasedRoute from './components/RoleBasedRoute';
import { ROLES } from './utils/permissions';

function RequireAuth({ children }) {
  const auth = useAuth();
  if (auth.loading) return null; // or a spinner
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="community/school/:schoolId" element={<CommunityPage />} />
        <Route path="community/group/:groupId" element={<CommunityPage />} />
        <Route path="community/batch/:batchId" element={<CommunityPage />} />
        <Route path="beneficiary" element={<Beneficiary />} />
        <Route path="beneficiary/mother/:id" element={<Beneficiary />} />
        <Route path="beneficiary/create/mother" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><Beneficiary /></RoleBasedRoute>} />
        <Route path="beneficiary/create/child" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><Beneficiary /></RoleBasedRoute>} />
        <Route path="beneficiary/mother/:id/child" element={<MotherChildrenPage />} />
        <Route path="beneficiary/child/:childId" element={<ChildProfilePage />} />
        <Route path="beneficiary/child/:childId/edit" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><EditChildPage /></RoleBasedRoute>} />
        <Route path="beneficiary/mother/:id/monitoring" element={<MonitoringPage />} />
        <Route path="beneficiary/mother/:id/edit" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><EditMotherPage /></RoleBasedRoute>} />
        <Route path="monitoring" element={<MonitoringPage />} />
        <Route path="checkup" element={<MonitoringPage />} />
        <Route path="program" element={<Program />} />
        <Route path="program/:programId" element={<Program />} />
        <Route path="program/:programId/cluster/:clusterType/:clusterName" element={<Program />} />
        <Route path="progress-report" element={<ProgressReport />} />
        <Route path="user-management" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><UserManagementPage /></RoleBasedRoute>} />
        <Route path="user-management/user/:id" element={<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}><UserDetailPage /></RoleBasedRoute>} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="community" replace />} />
      </Route>
    </Routes>
  );
}
