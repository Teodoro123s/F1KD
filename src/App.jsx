import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Community from './pages/Community';
import Beneficiary from './pages/Beneficiary';
import Monitoring from './pages/Monitoring';
import Program from './pages/Program';
import ProgressReport from './pages/ProgressReport';
import UserManagement from './pages/UserManagement';
import Login from './pages/Login';
import { isAuthenticated } from './utils/auth';

function RequireAuth({ children }) {
  if (!isAuthenticated()) {
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
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="community" element={<Community />} />
        <Route path="beneficiary" element={<Beneficiary />} />
        <Route path="monitoring" element={<Monitoring />} />
        <Route path="program" element={<Program />} />
        <Route path="progress-report" element={<ProgressReport />} />
        <Route path="user-management" element={<UserManagement />} />
        <Route path="*" element={<Navigate to="community" replace />} />
      </Route>
    </Routes>
  );
}
