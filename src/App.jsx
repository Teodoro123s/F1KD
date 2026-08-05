import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Community from './pages/Community';
import Beneficiary from './pages/Beneficiary';
import Monitoring from './pages/Monitoring';
import Program from './pages/Program';
import ProgressReport from './pages/ProgressReport';
import UserManagement from './pages/UserManagement';

export default function App() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <Topbar />
        <div className="content-body">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/community" element={<Community />} />
            <Route path="/beneficiary" element={<Beneficiary />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/program" element={<Program />} />
            <Route path="/progress-report" element={<ProgressReport />} />
            <Route path="/user-management" element={<UserManagement />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
