import React from 'react';
import Button from './Button';

export default function ErrorState({
  title = 'Unable to load data',
  message = 'Please try again.',
  onRetry,
  className = '',
}) {
  return (
    <div className={`ui-error-state ${className}`.trim()} role="alert">
      <strong>{title}</strong>
      {message && <p>{message}</p>}
      {onRetry && (
        <Button type="button" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
