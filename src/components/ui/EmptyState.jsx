import React from 'react';

export default function EmptyState({
  title = 'No records found',
  description = '',
  className = '',
}) {
  return (
    <div className={`ui-empty-state ${className}`.trim()} role="status">
      <strong>{title}</strong>
      {description && <p>{description}</p>}
    </div>
  );
}
