import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ActionFeedback from './ActionFeedback';

export default function Layout() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <Topbar />
        <ActionFeedback />
        <div className="content-body view-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
