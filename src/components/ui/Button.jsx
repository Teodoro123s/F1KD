import React, { forwardRef } from 'react';

const variantClasses = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  destructive: 'btn-danger',
  icon: 'btn-icon',
};

const sizeClasses = {
  small: 'btn-size-small',
  medium: '',
  large: 'btn-size-large',
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
    variantClass,
    sizeClass,
    loading ? 'btn-is-loading' : '',
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
      {loading && <span className="button-spinner" aria-hidden="true" />}
      {loading && <span className="button-loading-label">{loadingLabel}</span>}
      {!loading && children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;

export function LoadingButton(props) {
  return <Button {...props} loading />;
}
