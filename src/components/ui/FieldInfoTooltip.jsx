import React, { useId } from 'react';

export default function FieldInfoTooltip({ content }) {
  const tooltipId = useId();
  return (
    <span className="field-help-tooltip" tabIndex={0} aria-label={`Help: ${content}`} aria-describedby={tooltipId}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="10.5" x2="12" y2="16.5" />
        <circle cx="12" cy="7.25" r="0.9" fill="currentColor" stroke="none" />
      </svg>
      <span className="field-help-tooltip-bubble" role="tooltip" id={tooltipId}>{content}</span>
    </span>
  );
}
