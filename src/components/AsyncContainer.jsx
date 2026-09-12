import React from 'react';

export function Spinner({ label = 'Loading...', size = 'md', className = '' }) {
  const sizeMap = {
    sm: 'spinner-sm',
    md: 'spinner-md',
    lg: 'spinner-lg',
  };

  return (
    <div className={`async-loader ${className}`.trim()} role="status" aria-live="polite">
      <span className={`spinner ${sizeMap[size] || 'spinner-md'}`} aria-hidden="true" />
      <span className="async-loader-label">{label}</span>
    </div>
  );
}

export function EmptyState({
  title = 'No data available',
  description = 'There is nothing to show right now.',
  action,
  className = '',
}) {
  return (
    <div className={`async-empty-state ${className}`.trim()}>
      <div className="async-empty-state-card">
        <div className="async-empty-icon" aria-hidden="true">○</div>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
        {action && <div className="async-empty-action">{action}</div>}
      </div>
    </div>
  );
}

export function AsyncContainer({
  loading = false,
  empty = false,
  error = null,
  loadingLabel = 'Loading...',
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting the filters or check back later.',
  action = null,
  children,
  className = '',
}) {
  if (loading) {
    return <div className={`async-container ${className}`.trim()}><Spinner label={loadingLabel} /></div>;
  }

  if (error) {
    return (
      <div className={`async-container ${className}`.trim()}>
        <EmptyState
          title="Something went wrong"
          description={typeof error === 'string' ? error : 'The data could not be loaded right now.'}
          action={action}
        />
      </div>
    );
  }

  if (empty) {
    return (
      <div className={`async-container ${className}`.trim()}>
        <EmptyState title={emptyTitle} description={emptyDescription} action={action} />
      </div>
    );
  }

  return <div className={`async-container ${className}`.trim()}>{children}</div>;
}
