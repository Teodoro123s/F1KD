import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <Topbar />
        <div className="content-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
