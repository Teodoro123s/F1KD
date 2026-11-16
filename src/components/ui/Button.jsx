import React, { forwardRef } from 'react';

const baseClasses = 'inline-flex items-center justify-center gap-[var(--button-icon-gap,0.5rem)] border rounded-[var(--button-radius,var(--radius-md))] in-[.view-content]:rounded-[11px] font-[inherit] font-[var(--button-font-weight,600)] leading-[1.2] cursor-pointer no-underline transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-[var(--motion-popover-duration)] ease-[var(--motion-ease-standard)] active:scale-[0.98] focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-[var(--field-focus-ring,rgba(21,128,61,0.2))] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none';

const variantClasses = {
  primary: 'border-f1kd-brand bg-f1kd-brand text-white hover:border-f1kd-brand-hover hover:bg-f1kd-brand-hover hover:-translate-y-px',
  secondary: 'border-f1kd-border-strong bg-f1kd-surface text-f1kd-secondary hover:border-slate-400 hover:bg-f1kd-surface-soft hover:text-f1kd-text hover:-translate-y-px',
  outline: 'border-f1kd-border-strong bg-f1kd-surface text-f1kd-secondary hover:border-slate-400 hover:bg-f1kd-surface-soft hover:text-f1kd-text hover:-translate-y-px',
  ghost: 'border-transparent bg-transparent text-f1kd-secondary hover:bg-f1kd-surface-muted hover:text-f1kd-text hover:-translate-y-px',
  destructive: 'border-f1kd-error bg-f1kd-error text-white hover:border-f1kd-error-hover hover:bg-f1kd-error-hover hover:-translate-y-px hover:shadow-sm',
  icon: 'p-0 border-transparent bg-transparent text-f1kd-secondary hover:border-f1kd-border hover:bg-f1kd-surface-soft',
};

const sizeClasses = {
  small: 'min-h-[var(--control-height-sm)] px-[0.7rem] py-[0.35rem] text-f1kd-sm',
  medium: 'min-h-[var(--control-height-md)] px-4 py-[0.55rem] text-[length:var(--button-font-size,0.875rem)]',
  large: 'min-h-[var(--control-height-lg)] px-[1.15rem] py-[0.65rem] text-f1kd-md',
};

const iconSizeClasses = {
  small: 'size-[var(--control-height-sm)] min-w-[var(--control-height-sm)]',
  medium: 'size-[var(--control-height-md)] min-w-[var(--control-height-md)]',
  large: 'w-[var(--control-height-md)] min-w-[var(--control-height-md)] h-[var(--control-height-lg)] min-h-[var(--control-height-lg)]',
};

const Button = forwardRef(function Button({
  type = 'button',
  variant = 'primary',
  size = 'medium',
  loading = false,
  loadingLabel = 'Loading',
  disabled = false,
  className = '',
  children,
  ...buttonProps
}, ref) {
  const variantClass = variantClasses[variant];
  const sizeClass = sizeClasses[size];
  if (!variantClass) throw new TypeError(`Unsupported button variant: ${variant}`);
  if (sizeClass === undefined) throw new TypeError(`Unsupported button size: ${size}`);

  const classes = [
    baseClasses,
    variantClass,
    variant === 'icon' ? iconSizeClasses[size] : sizeClass,
    loading ? 'cursor-progress' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      {...buttonProps}
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span className="size-4 shrink-0 border-2 border-current border-r-transparent rounded-full animate-[spin_700ms_linear_infinite]" aria-hidden="true" />}
      {loading && <span className="whitespace-nowrap">{loadingLabel}</span>}
      {!loading && children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;

export function LoadingButton(props) {
  return <Button {...props} loading />;
}
