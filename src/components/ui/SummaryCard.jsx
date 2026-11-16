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
  const classes = [
    'grid content-start justify-items-start gap-[0.3rem] self-start min-w-0 h-[84px] min-h-0 px-[0.85rem] py-[0.7rem] border border-[#dfe6ee] rounded-lg bg-white text-slate-900 text-left font-[inherit] animate-[f1kd-card-enter_var(--motion-modal-duration)_var(--motion-ease-out)_both] motion-reduce:animate-none',
    'in-[.view-content]:border-[var(--view-border-color)] in-[.view-content]:rounded-[14px] in-[.view-content]:bg-[var(--view-bg-white)] in-[.view-content]:shadow-[var(--system-surface-shadow)] in-[.view-content]:gap-[0.2rem] in-[.view-content]:animate-[system-surface-enter_360ms_var(--motion-ease-out)_both] in-[.view-content]:motion-reduce:animate-none',
    interactive && 'w-full cursor-pointer transition-[border-color,box-shadow,transform] duration-[var(--motion-popover-duration)] ease-[var(--motion-ease-standard)] hover:border-f1kd-brand hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)] focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-[rgba(21,128,61,0.3)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-[0.65]',
    selected && 'border-f1kd-brand shadow-[0_6px_16px_rgba(15,23,42,0.08)] -translate-y-px',
    interactive && 'in-[.view-content]:hover:shadow-[var(--system-surface-shadow-hover)] in-[.view-content]:hover:-translate-y-0.5',
    selected && 'in-[.view-content]:border-f1kd-brand in-[.view-content]:shadow-[var(--system-surface-shadow-hover)] in-[.view-content]:-translate-y-0.5',
    className,
  ].filter(Boolean).join(' ');
  const supportText = action ?? description;
  const content = (
    <>
      <span className="text-[#64748b] text-[0.72rem] font-bold tracking-[0.02em] uppercase in-[.view-content]:text-[var(--view-text-muted)]">{label}</span>
      {value !== undefined && value !== null && (
        <strong className="text-slate-900 text-[1.4rem] leading-[1.1] in-[.view-content]:text-[var(--view-text)]">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </strong>
      )}
      {supportText && <span className="text-[#64748b] text-xs font-semibold in-[.view-content]:text-[var(--view-text-muted)]">{supportText}</span>}
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
