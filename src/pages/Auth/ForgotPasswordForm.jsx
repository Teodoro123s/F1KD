import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  KeyRound,
  Lock,
  RotateCw,
  ShieldCheck,
  User,
} from 'lucide-react';
import { requestPasswordReset, resetPassword } from '../../api/auth';
import { notifyAction } from '../../components/ActionFeedback';
import {
  loginButtonClassName,
  loginFieldClassName,
  loginFloatingLabelClassName,
  loginInputClassName,
} from './loginFieldStyles';

export default function ForgotPasswordForm({ email, onEmailChange, onBack, onComplete }) {
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passcodeFocused, setPasscodeFocused] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');
    let completionMessage = '';

    try {
      if (!resetCodeSent) {
        const result = await requestPasswordReset(email);
        setResetCodeSent(true);
        setStatusMessage(result.message || 'If an account exists for that email, a verification code has been sent.');
        return;
      }

      const result = await resetPassword(email, passcode, newPassword, confirmPassword);
      setPasscode('');
      setNewPassword('');
      setConfirmPassword('');
      completionMessage = result.message || 'Password reset successfully. You can now sign in.';
    } catch (error) {
      const message = error.message || 'Unable to reset password. Please try again.';
      setErrorMessage(message);
      notifyAction(message, 'error');
    } finally {
      setLoading(false);
    }

    if (completionMessage) onComplete(completionMessage);
  }

  async function resendCode() {
    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');
    setPasscode('');
    try {
      const result = await requestPasswordReset(email);
      setStatusMessage(result.message || 'If an account exists for that email, a verification code has been sent.');
    } catch (error) {
      const message = error.message || 'Unable to send another verification code.';
      setErrorMessage(message);
      notifyAction(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="login-header-text mb-9 flex w-full flex-col items-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={resetCodeSent ? 'step-code' : 'step-reset'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="login-title m-0 mb-2 text-[2.15rem] font-extrabold leading-[1.15] tracking-[-0.03em] text-[#0f172a] max-[480px]:text-[1.75rem]">
              {resetCodeSent ? 'Set New Password' : 'Reset Password'}
            </h1>
            <p className="login-subtitle m-0 max-w-80 text-center text-[0.95rem] leading-[1.45] text-[#64748b]">
              {resetCodeSent
                ? 'Enter the 6-digit verification code and your new password.'
                : 'Enter your email to receive a password reset verification code.'}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <form className="login-form flex w-full flex-col gap-7" onSubmit={handleSubmit} noValidate>
        <AnimatePresence mode="wait" initial={false}>
          {!resetCodeSent ? (
          <motion.div
            key="forgot-email-step"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="login-fields-container flex w-full flex-col gap-7"
          >
            <div className={`${loginFieldClassName} ${email ? 'has-value' : ''} ${emailFocused ? 'is-focused' : ''}`}>
              <div className="login-floating-field__row flex min-h-[50px] items-end gap-3 pb-2">
                <span className="login-floating-field__icon login-floating-field__icon--user flex shrink-0 items-center justify-center pb-1 text-[#8b1d2c] transition-colors duration-200" aria-hidden="true">
                  <User size={19} />
                </span>
                <div className="login-floating-field__input-wrap relative flex min-w-0 flex-1 flex-col justify-end">
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    value={email}
                    aria-label="Email address"
                    aria-invalid={Boolean(errorMessage)}
                    aria-describedby={errorMessage ? 'reset-error-message' : undefined}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    onChange={(event) => {
                      onEmailChange(event.target.value);
                      setErrorMessage('');
                      setStatusMessage('');
                    }}
                    placeholder=" "
                    autoComplete="username"
                    required
                    className={loginInputClassName}
                  />
                  <label htmlFor="reset-email" className={loginFloatingLabelClassName}>
                    Username or Email <span className="login-required-star ml-0.5 font-bold text-red-500">*</span>
                  </label>
                </div>
              </div>
              <div className="login-floating-field__line absolute bottom-0 left-0 right-0 h-[1.5px] overflow-hidden bg-[#e2e8f0] after:absolute after:inset-0 after:origin-center after:scale-x-0 after:bg-[#15803d] after:transition-transform after:duration-[250ms] after:[content:''] after:[transition-timing-function:cubic-bezier(0.2,0,0,1)]" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="reset-code-step"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="login-fields-container flex w-full flex-col gap-7"
          >
            <div className={`${loginFieldClassName} ${passcode ? 'has-value' : ''} ${passcodeFocused ? 'is-focused' : ''}`}>
              <div className="login-floating-field__row flex min-h-[50px] items-end gap-3 pb-2">
                <span className="login-floating-field__icon flex shrink-0 items-center justify-center pb-1 text-[#64748b] transition-colors duration-200" aria-hidden="true">
                  <ShieldCheck size={19} />
                </span>
                <div className="login-floating-field__input-wrap relative flex min-w-0 flex-1 flex-col justify-end">
                  <input
                    id="reset-passcode"
                    name="passcode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={passcode}
                    aria-invalid={Boolean(errorMessage)}
                    aria-describedby={errorMessage ? 'reset-error-message' : undefined}
                    onFocus={() => setPasscodeFocused(true)}
                    onBlur={() => setPasscodeFocused(false)}
                    onChange={(event) => {
                      setPasscode(event.target.value.replace(/\D/g, '').slice(0, 6));
                      setErrorMessage('');
                    }}
                    placeholder=" "
                    required
                    className={loginInputClassName}
                  />
                  <label htmlFor="reset-passcode" className={loginFloatingLabelClassName}>
                    Verification code <span className="login-required-star ml-0.5 font-bold text-red-500">*</span>
                  </label>
                </div>
              </div>
              <div className="login-floating-field__line absolute bottom-0 left-0 right-0 h-[1.5px] overflow-hidden bg-[#e2e8f0] after:absolute after:inset-0 after:origin-center after:scale-x-0 after:bg-[#15803d] after:transition-transform after:duration-[250ms] after:[content:''] after:[transition-timing-function:cubic-bezier(0.2,0,0,1)]" />
            </div>

            <div className={`${loginFieldClassName} ${newPassword ? 'has-value' : ''} ${newPasswordFocused ? 'is-focused' : ''}`}>
              <div className="login-floating-field__row flex min-h-[50px] items-end gap-3 pb-2">
                <span className="login-floating-field__icon login-floating-field__icon--key flex shrink-0 items-center justify-center pb-1 text-[#64748b] transition-colors duration-200" aria-hidden="true">
                  <KeyRound size={19} />
                </span>
                <div className="login-floating-field__input-wrap relative flex min-w-0 flex-1 flex-col justify-end">
                  <input
                    id="reset-new-password"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={newPassword}
                    aria-invalid={Boolean(errorMessage)}
                    aria-describedby={errorMessage ? 'reset-error-message' : undefined}
                    onFocus={() => setNewPasswordFocused(true)}
                    onBlur={() => setNewPasswordFocused(false)}
                    onChange={(event) => { setNewPassword(event.target.value); setErrorMessage(''); }}
                    placeholder=" "
                    required
                    className={loginInputClassName}
                  />
                  <label htmlFor="reset-new-password" className={loginFloatingLabelClassName}>
                    New password <span className="login-required-star ml-0.5 font-bold text-red-500">*</span>
                  </label>
                </div>
              </div>
              <div className="login-floating-field__line absolute bottom-0 left-0 right-0 h-[1.5px] overflow-hidden bg-[#e2e8f0] after:absolute after:inset-0 after:origin-center after:scale-x-0 after:bg-[#15803d] after:transition-transform after:duration-[250ms] after:[content:''] after:[transition-timing-function:cubic-bezier(0.2,0,0,1)]" />
            </div>

            <div className={`${loginFieldClassName} ${confirmPassword ? 'has-value' : ''} ${confirmPasswordFocused ? 'is-focused' : ''}`}>
              <div className="login-floating-field__row flex min-h-[50px] items-end gap-3 pb-2">
                <span className="login-floating-field__icon login-floating-field__icon--key flex shrink-0 items-center justify-center pb-1 text-[#64748b] transition-colors duration-200" aria-hidden="true">
                  <Lock size={19} />
                </span>
                <div className="login-floating-field__input-wrap relative flex min-w-0 flex-1 flex-col justify-end">
                  <input
                    id="reset-confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={confirmPassword}
                    aria-invalid={Boolean(errorMessage)}
                    aria-describedby={errorMessage ? 'reset-error-message' : undefined}
                    onFocus={() => setConfirmPasswordFocused(true)}
                    onBlur={() => setConfirmPasswordFocused(false)}
                    onChange={(event) => { setConfirmPassword(event.target.value); setErrorMessage(''); }}
                    placeholder=" "
                    required
                    className={loginInputClassName}
                  />
                  <label htmlFor="reset-confirm-password" className={loginFloatingLabelClassName}>
                    Confirm new password <span className="login-required-star ml-0.5 font-bold text-red-500">*</span>
                  </label>
                </div>
              </div>
              <div className="login-floating-field__line absolute bottom-0 left-0 right-0 h-[1.5px] overflow-hidden bg-[#e2e8f0] after:absolute after:inset-0 after:origin-center after:scale-x-0 after:bg-[#15803d] after:transition-transform after:duration-[250ms] after:[content:''] after:[transition-timing-function:cubic-bezier(0.2,0,0,1)]" />
            </div>
          </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {errorMessage && (
            <motion.div
              className="login-error flex items-start gap-[0.65rem] rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-[0.85rem] text-[#991b1b] [&_svg]:mt-[0.1rem] [&_svg]:h-5 [&_svg]:w-5 [&_svg]:flex-[0_0_1.25rem] [&_strong]:block [&_strong]:text-[0.875rem] [&_strong]:font-semibold [&_strong]:leading-[1.35] [&_p]:mt-[0.2rem] [&_p]:mb-0 [&_p]:text-[0.8125rem] [&_p]:leading-[1.45] [&_p]:text-[#7f1d1d] [&_p]:[overflow-wrap:anywhere]"
              role="alert"
              aria-live="assertive"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: [0, -8, 8, -6, 6, -3, 3, 0] }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <AlertCircle size={20} className="login-error-icon mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <strong>We couldn’t complete that request</strong>
                <p id="reset-error-message">{errorMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {statusMessage && (
            <motion.p
              className="login-status m-0 rounded-[10px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[0.875rem] font-medium text-[#166534]"
              role="status"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {statusMessage}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="login-actions mt-2">
          <motion.button
            type="submit"
            className={loginButtonClassName}
            whileHover={!loading ? { scale: 1.015, boxShadow: '0 8px 24px rgba(21, 128, 61, 0.35)' } : undefined}
            whileTap={!loading ? { scale: 0.985 } : undefined}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            aria-label={loading ? 'Please wait…' : resetCodeSent ? 'Reset password' : 'Send verification code'}
            disabled={loading}
          >
            {loading && <RotateCw size={17} className="login-button-spinner animate-spin shrink-0 [animation-duration:0.9s]" aria-hidden="true" />}
            <span>
              {loading ? 'Please wait…' : resetCodeSent ? 'Reset Password' : 'Send Verification Code'}
            </span>
          </motion.button>
        </div>

        <motion.div
          className="login-reset-actions mt-2 flex items-center justify-between gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <button
            type="button"
            className="login-forgot-link login-back-link inline-flex items-center gap-[0.4rem] cursor-pointer border-0 bg-transparent p-0 text-[0.875rem] font-medium text-[#64748b] no-underline transition-colors duration-150 hover:text-[#15803d] hover:underline"
            onClick={onBack}
            disabled={loading}
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Back to Log In</span>
          </button>
          {resetCodeSent && (
            <button
              type="button"
              className="login-forgot-link login-resend-link inline-flex items-center gap-[0.4rem] cursor-pointer border-0 bg-transparent p-0 text-[0.875rem] font-medium text-[#64748b] no-underline transition-colors duration-150 hover:text-[#15803d] hover:underline"
              onClick={resendCode}
              disabled={loading}
            >
              <RotateCw size={13} aria-hidden="true" />
              <span>Send a new code</span>
            </button>
          )}
        </motion.div>
      </form>
    </>
  );
}
