import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { MothersProvider } from './context/MothersContext';
import Dashboard from './pages/Dashboard';
import CommunityPage from './pages/Community/CommunityPage';
import Beneficiary from './pages/Beneficiary/BeneficiaryPage';
import Monitoring from './pages/Monitoring/Monitoring';
import MotherMonitoringPage from './pages/Beneficiary/mother/MotherMonitoringPage';
import ChildProfilePage from './pages/Beneficiary/child/ChildProfilePage';
import EditChildPage from './pages/Beneficiary/child/EditChildPage';
import EditMotherPage from './pages/Beneficiary/mother/EditMotherPage';
import Program from './pages/Program';
import ProgressReport from './pages/ProgressReport';
import UserManagementPage from './pages/UserManagement/UserManagementPage';
import UserDetailPage from './pages/UserManagement/UserDetailPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import Login from './pages/Login';
import { useAuth } from './auth/AuthProvider';

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
      <Route path="/" element={<Navigate to="/community" replace />} />
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
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="community/school/:schoolId" element={<CommunityPage />} />
        <Route path="community/group/:groupId" element={<CommunityPage />} />
        <Route path="community/batch/:batchId" element={<CommunityPage />} />
        <Route path="beneficiary" element={<Beneficiary />} />
        <Route path="beneficiary/create/mother" element={<Beneficiary />} />
        <Route path="beneficiary/create/child" element={<Beneficiary />} />
        <Route path="beneficiary/mother/:id/child" element={<ChildProfilePage />} />
        <Route path="beneficiary/child/:childId" element={<ChildProfilePage />} />
        <Route path="beneficiary/child/:childId/edit" element={<EditChildPage />} />
        <Route path="beneficiary/mother/:id/monitoring" element={<MotherMonitoringPage />} />
        <Route path="beneficiary/mother/:id/edit" element={<EditMotherPage />} />
        <Route path="monitoring" element={<Monitoring />} />
        <Route path="program" element={<Program />} />
        <Route path="progress-report" element={<ProgressReport />} />
        <Route path="user-management" element={<UserManagementPage />} />
        <Route path="user-management/user/:id" element={<UserDetailPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="community" replace />} />
      </Route>
    </Routes>
  );
}
