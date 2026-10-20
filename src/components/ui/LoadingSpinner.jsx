import React from 'react';

const sizeClasses = {
  small: 'ui-loading-spinner--small',
  medium: '',
  large: 'ui-loading-spinner--large',
};

export default function LoadingSpinner({
  label = 'Loading...',
  size = 'medium',
  className = '',
}) {
  const sizeClass = sizeClasses[size];
  if (sizeClass === undefined) throw new TypeError(`Unsupported loading spinner size: ${size}`);

  return (
    <span
      className={`ui-loading-spinner ${sizeClass} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span className="ui-loading-spinner__indicator" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
