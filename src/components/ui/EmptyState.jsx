import React from 'react';

export default function EmptyState({
  title = 'No records found',
  description = '',
  className = '',
}) {
  return (
    <div className={`ui-empty-state grid justify-items-center gap-2 text-f1kd-secondary text-f1kd-sm ${className}`.trim()} role="status">
      <strong>{title}</strong>
      {description && <p className="m-0 text-f1kd-muted">{description}</p>}
    </div>
  );
}
