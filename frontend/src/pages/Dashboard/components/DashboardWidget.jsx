import React from 'react';

export default function DashboardWidget({ title, children, actionLabel }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
        {actionLabel && <button type="button" className="ghost-btn">{actionLabel}</button>}
      </div>
      {children}
    </div>
  );
}
