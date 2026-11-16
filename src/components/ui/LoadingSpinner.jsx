import React from 'react';

const sizeClasses = {
  small: { text: 'text-f1kd-xs', indicator: 'size-[0.8rem]' },
  medium: { text: 'text-f1kd-sm', indicator: 'size-4' },
  large: { text: 'text-f1kd-md', indicator: 'size-[1.4rem]' },
};

export default function LoadingSpinner({
  label = 'Loading...',
  size = 'medium',
  className = '',
}) {
  const sizeClass = sizeClasses[size];
  if (!sizeClass) throw new TypeError(`Unsupported loading spinner size: ${size}`);

  return (
    <span
      className={`inline-flex items-center justify-center gap-2 text-f1kd-muted ${sizeClass.text} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <span className={`shrink-0 border-2 border-current border-r-transparent rounded-full animate-[spin_700ms_linear_infinite] ${sizeClass.indicator}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
