import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ActionFeedback from './ActionFeedback';
import { KinFlowProvider } from '../kinFlow/KinFlowProvider';

export default function Layout() {
  return (
    <KinFlowProvider>
      <div className="layout">
        <Sidebar />
        <main className="main">
          <Topbar />
          <ActionFeedback />
          <div className="content-body view-content" data-kin-flow-target="page-content">
            <Outlet />
          </div>
        </main>
      </div>
    </KinFlowProvider>
  );
}
