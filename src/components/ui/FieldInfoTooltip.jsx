import React, { useId, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';

export default function FieldInfoTooltip({ content, essential = false }) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const auth = useAuth();
  if (!essential && auth?.guidancePreferences?.contextualTooltipsEnabled === false) return null;

  return (
    <span
      className={`field-help-tooltip${open ? ' is-open' : ''}`}
      tabIndex={0}
      role="button"
      aria-label={`Help: ${content}`}
      aria-describedby={tooltipId}
      aria-expanded={open}
      onClick={() => setOpen((value) => !value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setOpen((value) => !value);
        } else if (event.key === 'Escape') {
          setOpen(false);
        }
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="10.5" x2="12" y2="16.5" />
        <circle cx="12" cy="7.25" r="0.9" fill="currentColor" stroke="none" />
      </svg>
      <span className="field-help-tooltip-bubble" role="tooltip" id={tooltipId}>{content}</span>
    </span>
  );
}
