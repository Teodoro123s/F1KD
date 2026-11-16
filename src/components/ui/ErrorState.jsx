import React from 'react';
import Button from './Button';

export default function ErrorState({
  title = 'Unable to load data',
  message = 'Please try again.',
  onRetry,
  className = '',
}) {
  return (
    <div className={`grid justify-items-center gap-2 text-f1kd-error text-f1kd-sm ${className}`.trim()} role="alert">
      <strong>{title}</strong>
      {message && <p className="m-0 text-f1kd-muted">{message}</p>}
      {onRetry && (
        <Button type="button" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
