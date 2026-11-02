import React from 'react';

export default function SummaryCard({
  label,
  value,
  description,
  action,
  selected = false,
  interactive = true,
  disabled = false,
  onClick,
  ariaPressed,
  ariaCurrent,
  className = '',
}) {
  const classes = ['summary-card', className, selected && 'is-selected']
    .filter(Boolean)
    .join(' ');
  const supportText = action ?? description;
  const content = (
    <>
      <span className="summary-card__label">{label}</span>
      {value !== undefined && value !== null && (
        <strong className="summary-card__value">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </strong>
      )}
      {supportText && <span className="summary-card__support">{supportText}</span>}
    </>
  );

  if (!interactive || typeof onClick !== 'function') {
    return <div className={classes}>{content}</div>;
  }

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={ariaPressed}
      aria-current={ariaCurrent}
    >
      {content}
    </button>
  );
}
