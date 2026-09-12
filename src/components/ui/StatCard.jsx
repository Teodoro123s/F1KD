import React from 'react';

export default function StatCard({ label, value, delta, tone = 'neutral', icon = null }) {
  const deltaClass = delta && delta.direction === 'up' ? 'view-stat-card__delta--up' : 'view-stat-card__delta--down';

  return (
    <div className="view-stat-card">
      <div className="view-stat-card__header">
        <span className="view-stat-card__label">{label}</span>
        {icon}
      </div>
      <div className="view-stat-card__value">{value}</div>
      {delta && (
        <div className={`view-stat-card__delta ${deltaClass}`}>
          {delta.direction === 'up' ? '↑' : '↓'} {delta.percentage}%
        </div>
      )}
    </div>
  );
}
