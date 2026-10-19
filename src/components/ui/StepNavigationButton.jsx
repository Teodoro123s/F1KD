import React from 'react';

export function StepNavigationButton({
  children,
  loading = false,
  disabled = false,
  loadingLabel = 'Loading...',
  className,
  ...props
}) {
  return (
    <button
      {...props}
      type={props.type || 'button'}
      className={className}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span className="spinner spinner-sm step-navigation-spinner" aria-hidden="true" />}
      {loading ? loadingLabel : children}
    </button>
  );
}

export function StepNavigationError({ error }) {
  if (!error) return null;
  return <p className="field-validation-error step-navigation-error" role="alert">{error}</p>;
}

export function StepNavigationStatus({ direction, error }) {
  if (error) return <StepNavigationError error={error} />;
  if (direction !== 'step') return null;
  return (
    <span className="step-navigation-status" role="status" aria-live="polite">
      <span className="spinner spinner-sm" aria-hidden="true" />
      Loading...
    </span>
  );
}
