import React from 'react';

export default function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* placeholder for breadcrumbs or page title */}
      </div>

      <div className="topbar-actions">
        <button className="icon-button" aria-label="Notifications">🔔</button>
        <button className="icon-button user" aria-label="User menu">👤</button>
      </div>
    </header>
  );
}
