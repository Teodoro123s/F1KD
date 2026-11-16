import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  ArrowLeft,
  RotateCw,
} from 'lucide-react';
import logo from '../../assets/f1kd-logo.png';
import { useAuth } from '../../auth/AuthProvider';
import ActionFeedback, { notifyAction } from '../../components/ActionFeedback';
import { getLoginAttemptStatus, requestPasswordReset, resetPassword } from '../../api/auth';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(() => {
    try {
      if (localStorage.getItem('f1kd_remember_me') === 'true') {
        return localStorage.getItem('f1kd_remembered_email') || '';
      }
    } catch {}
    return '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [passcodeFocused, setPasscodeFocused] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem('f1kd_remember_me') === 'true';
    } catch {
      return false;
    }
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginAttemptStatus, setLoginAttemptStatus] = useState(null);
  const [retryDeadline, setRetryDeadline] = useState(null);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const statusRequestId = useRef(0);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const auth = useAuth();

  // Sync autofilled or remembered values on mount and after browser autofill events
  useEffect(() => {
    const syncAutofill = () => {
      if (emailInputRef.current?.value && emailInputRef.current.value !== email) {
        setEmail(emailInputRef.current.value);
      }
      if (passwordInputRef.current?.value && passwordInputRef.current.value !== password) {
        setPassword(passwordInputRef.current.value);
      }
    };

    syncAutofill();
    const t1 = setTimeout(syncAutofill, 50);
    const t2 = setTimeout(syncAutofill, 150);
    const t3 = setTimeout(syncAutofill, 350);
    const t4 = setTimeout(syncAutofill, 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  useEffect(() => {
    if (!retryDeadline) {
      setRetryCountdown(0);
      return undefined;
    }

    let intervalId;
    const updateCountdown = () => {
      const secondsRemaining = Math.max(0, Math.ceil((retryDeadline - Date.now()) / 1000));
      setRetryCountdown(secondsRemaining);
      if (secondsRemaining === 0) {
        window.clearInterval(intervalId);
        setRetryDeadline(null);
        setLoginAttemptStatus((current) => current
          ? { ...current, remainingAttempts: current.maxAttempts }
          : current);
        setErrorMessage('');
        setStatusMessage('You can try signing in again now.');
        notifyAction('You can try signing in again now.', 'success');
      }
    };

    updateCountdown();
    intervalId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(intervalId);
  }, [retryDeadline]);

  async function refreshLoginAttemptStatus(value) {
    const normalizedEmail = value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return;

    const requestId = ++statusRequestId.current;
    try {
      const status = await getLoginAttemptStatus(normalizedEmail);
      if (requestId !== statusRequestId.current || normalizedEmail !== email.trim().toLowerCase()) return;
      setLoginAttemptStatus(status);
      setRetryDeadline(status.retryAfterSeconds > 0
        ? Date.now() + status.retryAfterSeconds * 1000
        : null);
      if (status.retryAfterSeconds > 0) {
        setStatusMessage('');
      }
    } catch (error) {
      if (requestId !== statusRequestId.current) return;
      console.error('Unable to load login attempt status:', error);
      setErrorMessage('Unable to check sign-in availability. You can still try to sign in.');
    }
  }

  useEffect(() => {
    const handleFocus = () => {
      if (!forgotPassword) refreshLoginAttemptStatus(email);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [email, forgotPassword]);

  async function handleLogin(event) {
    event.preventDefault();
    setErrorMessage('');
    setStatusMessage('');
    setLoading(true);
    const submittedEmail = (email || emailInputRef.current?.value || '').trim();
    const submittedPassword = password || passwordInputRef.current?.value || '';
    try {
      await auth.login(submittedEmail, submittedPassword);
      if (rememberMe) {
        try {
          localStorage.setItem('f1kd_remember_me', 'true');
          localStorage.setItem('f1kd_remembered_email', submittedEmail);
        } catch {}
      } else {
        try {
          localStorage.removeItem('f1kd_remember_me');
          localStorage.removeItem('f1kd_remembered_email');
        } catch {}
      }
      setLoginAttemptStatus(null);
      setRetryDeadline(null);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed', err);
      const body = err.body || {};
      if (Number.isSafeInteger(body.maxAttempts) && Number.isSafeInteger(body.remainingAttempts)) {
        setLoginAttemptStatus(body);
      }
      if (body.retryAfterSeconds > 0) {
        const deadline = Date.now() + body.retryAfterSeconds * 1000;
        setRetryDeadline(deadline);
        setErrorMessage('');
        setStatusMessage('');
        notifyAction('Too many failed attempts. Sign-in is temporarily locked.', 'warning');
      } else {
        const notificationMessage = body.code === 'INVALID_CREDENTIALS'
          ? body.message
          : err.status === 429 && err.retryAfterSeconds
            ? 'Too many sign-in requests. Please wait before trying again.'
            : err.message || 'Login failed. Please check your credentials and try again.';
        const displayMessage = body.code === 'INVALID_CREDENTIALS'
          ? 'The email address or password is incorrect.'
          : notificationMessage;
        setErrorMessage(displayMessage);
        notifyAction(notificationMessage, body.remainingAttempts === 1 ? 'warning' : 'error');
        if (err.status === 429 && err.retryAfterSeconds) {
          setRetryDeadline(Date.now() + err.retryAfterSeconds * 1000);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset(event) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');
    try {
      if (!resetCodeSent) {
        const result = await requestPasswordReset(email);
        setResetCodeSent(true);
        setStatusMessage(result.message || 'If an account exists for that email, a verification code has been sent.');
        return;
      }
      const result = await resetPassword(email, passcode, newPassword, confirmPassword);
      setForgotPassword(false);
      setResetCodeSent(false);
      setPasscode('');
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
      setStatusMessage(result.message || 'Password reset successfully. You can now sign in.');
    } catch (err) {
      const message = err.message || 'Unable to reset password. Please try again.';
      setErrorMessage(message);
      notifyAction(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function resendPasswordResetCode() {
    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');
    setPasscode('');
    try {
      const result = await requestPasswordReset(email);
      setStatusMessage(result.message || 'If an account exists for that email, a verification code has been sent.');
    } catch (err) {
      const message = err.message || 'Unable to send another verification code.';
      setErrorMessage(message);
      notifyAction(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function openPasswordReset() {
    statusRequestId.current += 1;
    setForgotPassword(true);
    setResetCodeSent(false);
    setErrorMessage('');
    setStatusMessage('');
  }

  function returnToSignIn() {
    statusRequestId.current += 1;
    setForgotPassword(false);
    setResetCodeSent(false);
    setPasscode('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setStatusMessage('');
  }

  return (
    <div className="login-page">
      <ActionFeedback />
      <div className="login-shell">
        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="login-header">
            <motion.img
              src={logo}
              alt="F1KD logo"
              className="login-logo"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, type: 'spring', stiffness: 280, damping: 20 }}
              whileHover={{ scale: 1.05 }}
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={forgotPassword ? (resetCodeSent ? 'step-code' : 'step-reset') : 'step-login'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="login-header-text"
              >
                <h1 className="login-title">
                  {forgotPassword
                    ? (resetCodeSent ? 'Set New Password' : 'Reset Password')
                    : 'Welcome Back'}
                </h1>
                <p className="login-subtitle">
                  {forgotPassword
                    ? (resetCodeSent
                        ? 'Enter the 6-digit verification code and your new password.'
                        : 'Enter your email to receive a password reset verification code.')
                    : ''}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <form className="login-form" onSubmit={forgotPassword ? handlePasswordReset : handleLogin} noValidate>
            <AnimatePresence mode="wait" initial={false}>
              {!forgotPassword ? (
                <motion.div
                  key="login-fields"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="login-fields-container"
                >
                  {/* Email / Username field */}
                  <div className={`login-floating-field ${email ? 'has-value' : ''} ${emailFocused ? 'is-focused' : ''}`}>
                    <div className="login-floating-field__row">
                      <span className="login-floating-field__icon login-floating-field__icon--user" aria-hidden="true">
                        <User size={19} />
                      </span>
                      <div className="login-floating-field__input-wrap">
                        <input
                          ref={emailInputRef}
                          id="login-email"
                          name="email"
                          type="email"
                          value={email}
                          aria-label="Email address"
                          aria-invalid={Boolean(errorMessage)}
                          aria-describedby={errorMessage ? 'login-error-message' : undefined}
                          onFocus={() => setEmailFocused(true)}
                          onBlur={(event) => {
                            setEmailFocused(false);
                            refreshLoginAttemptStatus(event.target.value);
                          }}
                          onChange={(event) => {
                            statusRequestId.current += 1;
                            setEmail(event.target.value);
                            setLoginAttemptStatus(null);
                            setRetryDeadline(null);
                            setErrorMessage('');
                            setStatusMessage('');
                          }}
                          onAnimationStart={(e) => {
                            if (e.animationName === 'onAutoFillStart' || e.animationName.includes('AutoFill') || e.animationName.includes('autofill')) {
                              if (e.target.value) setEmail(e.target.value);
                            }
                          }}
                          placeholder=" "
                          autoComplete="username"
                          required
                        />
                        <label htmlFor="login-email" className="login-floating-label">
                          Username <span className="login-required-star">*</span>
                        </label>
                      </div>
                    </div>
                    <div className="login-floating-field__line" />
                  </div>

                  {/* Password field */}
                  <div className={`login-floating-field ${password ? 'has-value' : ''} ${passwordFocused ? 'is-focused' : ''}`}>
                    <div className="login-floating-field__row">
                      <span className="login-floating-field__icon login-floating-field__icon--key" aria-hidden="true">
                        <Lock size={19} />
                      </span>
                      <div className="login-floating-field__input-wrap">
                        <input
                          ref={passwordInputRef}
                          id="login-password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          aria-label="Password"
                          aria-invalid={Boolean(errorMessage)}
                          aria-describedby={errorMessage ? 'login-error-message' : undefined}
                          onFocus={() => setPasswordFocused(true)}
                          onBlur={() => setPasswordFocused(false)}
                          onChange={(event) => { setPassword(event.target.value); setErrorMessage(''); }}
                          onAnimationStart={(e) => {
                            if (e.animationName === 'onAutoFillStart' || e.animationName.includes('AutoFill') || e.animationName.includes('autofill')) {
                              if (e.target.value) setPassword(e.target.value);
                            }
                          }}
                          placeholder=" "
                          autoComplete="current-password"
                          required
                        />
                        <label htmlFor="login-password" className="login-floating-label">
                          Password <span className="login-required-star">*</span>
                        </label>
                      </div>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((s) => !s)}
                        className="login-password-toggle-floating"
                      >
                        {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
                      </motion.button>
                    </div>
                    <div className="login-floating-field__line" />
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="login-options-row">
                    <label className="login-remember">
                      <input
                        type="checkbox"
                        id="login-remember"
                        name="remember"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span>Remember Me</span>
                    </label>
                    <button
                      type="button"
                      className="login-forgot-link"
                      onClick={openPasswordReset}
                      disabled={loading}
                    >
                      Forgot password?
                    </button>
                  </div>
                </motion.div>
              ) : !resetCodeSent ? (
                <motion.div
                  key="forgot-email-step"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="login-fields-container"
                >
                  <div className={`login-floating-field ${email ? 'has-value' : ''} ${emailFocused ? 'is-focused' : ''}`}>
                    <div className="login-floating-field__row">
                      <span className="login-floating-field__icon login-floating-field__icon--user" aria-hidden="true">
                        <User size={19} />
                      </span>
                      <div className="login-floating-field__input-wrap">
                        <input
                          id="login-email"
                          name="email"
                          type="email"
                          value={email}
                          aria-label="Email address"
                          aria-invalid={Boolean(errorMessage)}
                          aria-describedby={errorMessage ? 'login-error-message' : undefined}
                          onFocus={() => setEmailFocused(true)}
                          onBlur={() => setEmailFocused(false)}
                          onChange={(event) => {
                            setEmail(event.target.value);
                            setErrorMessage('');
                            setStatusMessage('');
                          }}
                          placeholder=" "
                          autoComplete="username"
                          required
                        />
                        <label htmlFor="login-email" className="login-floating-label">
                          Username or Email <span className="login-required-star">*</span>
                        </label>
                      </div>
                    </div>
                    <div className="login-floating-field__line" />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="reset-code-step"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="login-fields-container"
                >
                  {/* Passcode / Verification code */}
                  <div className={`login-floating-field ${passcode ? 'has-value' : ''} ${passcodeFocused ? 'is-focused' : ''}`}>
                    <div className="login-floating-field__row">
                      <span className="login-floating-field__icon" aria-hidden="true">
                        <ShieldCheck size={19} />
                      </span>
                      <div className="login-floating-field__input-wrap">
                        <input
                          id="reset-passcode"
                          name="passcode"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={passcode}
                          onFocus={() => setPasscodeFocused(true)}
                          onBlur={() => setPasscodeFocused(false)}
                          onChange={(event) => { setPasscode(event.target.value.replace(/\D/g, '').slice(0, 6)); setErrorMessage(''); }}
                          placeholder=" "
                          required
                        />
                        <label htmlFor="reset-passcode" className="login-floating-label">
                          Verification code <span className="login-required-star">*</span>
                        </label>
                      </div>
                    </div>
                    <div className="login-floating-field__line" />
                  </div>

                  {/* New Password */}
                  <div className={`login-floating-field ${newPassword ? 'has-value' : ''} ${newPasswordFocused ? 'is-focused' : ''}`}>
                    <div className="login-floating-field__row">
                      <span className="login-floating-field__icon login-floating-field__icon--key" aria-hidden="true">
                        <KeyRound size={19} />
                      </span>
                      <div className="login-floating-field__input-wrap">
                        <input
                          id="reset-new-password"
                          name="newPassword"
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          value={newPassword}
                          onFocus={() => setNewPasswordFocused(true)}
                          onBlur={() => setNewPasswordFocused(false)}
                          onChange={(event) => { setNewPassword(event.target.value); setErrorMessage(''); }}
                          placeholder=" "
                          required
                        />
                        <label htmlFor="reset-new-password" className="login-floating-label">
                          New password <span className="login-required-star">*</span>
                        </label>
                      </div>
                    </div>
                    <div className="login-floating-field__line" />
                  </div>

                  {/* Confirm Password */}
                  <div className={`login-floating-field ${confirmPassword ? 'has-value' : ''} ${confirmPasswordFocused ? 'is-focused' : ''}`}>
                    <div className="login-floating-field__row">
                      <span className="login-floating-field__icon login-floating-field__icon--key" aria-hidden="true">
                        <Lock size={19} />
                      </span>
                      <div className="login-floating-field__input-wrap">
                        <input
                          id="reset-confirm-password"
                          name="confirmPassword"
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          value={confirmPassword}
                          onFocus={() => setConfirmPasswordFocused(true)}
                          onBlur={() => setConfirmPasswordFocused(false)}
                          onChange={(event) => { setConfirmPassword(event.target.value); setErrorMessage(''); }}
                          placeholder=" "
                          required
                        />
                        <label htmlFor="reset-confirm-password" className="login-floating-label">
                          Confirm new password <span className="login-required-star">*</span>
                        </label>
                      </div>
                    </div>
                    <div className="login-floating-field__line" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!forgotPassword && loginAttemptStatus && retryCountdown === 0 && (
              <p
                className={`login-attempts${loginAttemptStatus.remainingAttempts === 1 ? ' login-attempts--warning' : ''}`}
                role="status"
                aria-live="polite"
              >
                {loginAttemptStatus.remainingAttempts === 1
                  ? 'Warning: Only 1 login attempt remaining before temporary lockout.'
                  : `You have ${loginAttemptStatus.remainingAttempts} login attempts remaining.`}
              </p>
            )}

            <AnimatePresence>
              {!forgotPassword && retryCountdown > 0 && (
                <motion.div
                  className="login-lockout"
                  role="status"
                  aria-live="polite"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <strong>Too many failed attempts.</strong>
                  <span>Please try again in </span>
                  <time aria-live="off">
                    {String(Math.floor(retryCountdown / 60)).padStart(2, '0')}:{String(retryCountdown % 60).padStart(2, '0')}
                  </time>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  className="login-error"
                  role="alert"
                  aria-live="assertive"
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    x: [0, -8, 8, -6, 6, -3, 3, 0],
                  }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <AlertCircle size={20} className="login-error-icon" aria-hidden="true" />
                  <div>
                    <strong>{forgotPassword ? 'We couldn’t complete that request' : 'We couldn’t sign you in'}</strong>
                    <p id="login-error-message">{errorMessage}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {statusMessage && (
                <motion.p
                  className="login-status"
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

            <div className="login-actions">
              <motion.button
                type="submit"
                className="login-button"
                whileHover={!loading ? { scale: 1.015, boxShadow: '0 8px 24px rgba(21, 128, 61, 0.35)' } : undefined}
                whileTap={!loading ? { scale: 0.985 } : undefined}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                aria-label={
                  loading
                    ? (forgotPassword ? 'Please wait…' : 'Signing in…')
                    : forgotPassword
                      ? resetCodeSent ? 'Reset password' : 'Send verification code'
                      : retryCountdown > 0 ? 'Please wait' : 'Sign in'
                }
                disabled={loading || (!forgotPassword && retryCountdown > 0)}
              >
                {loading && <RotateCw size={17} className="login-button-spinner" aria-hidden="true" />}
                <span>
                  {loading
                    ? (forgotPassword ? 'Please wait…' : 'Signing in…')
                    : forgotPassword
                      ? resetCodeSent ? 'Reset Password' : 'Send Verification Code'
                      : retryCountdown > 0 ? 'Please wait' : 'Log In'}
                </span>
              </motion.button>
            </div>

            {forgotPassword && (
              <motion.div
                className="login-reset-actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <button
                  type="button"
                  className="login-forgot-link login-back-link"
                  onClick={returnToSignIn}
                  disabled={loading}
                >
                  <ArrowLeft size={15} aria-hidden="true" />
                  <span>Back to Log In</span>
                </button>
                {resetCodeSent && (
                  <button
                    type="button"
                    className="login-forgot-link login-resend-link"
                    onClick={resendPasswordResetCode}
                    disabled={loading}
                  >
                    <RotateCw size={13} aria-hidden="true" />
                    <span>Send a new code</span>
                  </button>
                )}
              </motion.div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}
