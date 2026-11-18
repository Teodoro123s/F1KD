import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import logo from '../../assets/f1kd-logo.png';
import { useAuth } from '../../auth/AuthProvider';
import ActionFeedback, { notifyAction } from '../../components/ActionFeedback';
import { getLoginAttemptStatus } from '../../api/auth';
import ForgotPasswordForm from './ForgotPasswordForm';
import {
  loginButtonClassName,
  loginFieldClassName,
  loginFloatingLabelClassName,
  loginInputClassName,
} from './loginFieldStyles';

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

  function openPasswordReset() {
    statusRequestId.current += 1;
    setForgotPassword(true);
    setErrorMessage('');
    setStatusMessage('');
  }

  function returnToSignIn() {
    statusRequestId.current += 1;
    setForgotPassword(false);
    setErrorMessage('');
    setStatusMessage('');
  }

  function completePasswordReset(message) {
    setForgotPassword(false);
    setPassword('');
    setErrorMessage('');
    setStatusMessage(message);
  }

  return (
    <div className="login-page relative flex min-h-screen items-center justify-center bg-[#f8fafc] px-5 py-8 max-[480px]:p-4 [&_.action-feedback]:top-auto [&_.action-feedback]:right-[max(1rem,env(safe-area-inset-right))] [&_.action-feedback]:bottom-[max(1rem,env(safe-area-inset-bottom))]">
      <style>{'@keyframes onAutoFillStart{from{opacity:.99}to{opacity:1}}'}</style>
      <ActionFeedback />
      <div className="login-shell flex w-full max-w-[440px] flex-col items-center">
        <motion.div
          className="login-card relative box-border w-full rounded-[20px] border border-[#eef2f6] bg-white px-9 py-11 pb-10 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.04),0_20px_40px_-15px_rgba(15,23,42,0.07)] max-[480px]:rounded-2xl max-[480px]:px-5 max-[480px]:py-8 max-[480px]:pb-7"
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={`login-header flex flex-col items-center text-center ${forgotPassword ? '' : 'mb-9'}`}>
            <motion.img
              src={logo}
              alt="F1KD logo"
              className="login-logo mb-5 block h-11 w-auto object-contain"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, type: 'spring', stiffness: 280, damping: 20 }}
              whileHover={{ scale: 1.05 }}
            />
            {!forgotPassword && (
              <AnimatePresence mode="wait">
              <motion.div
                key="step-login"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="login-header-text flex w-full flex-col items-center text-center"
              >
                <h1 className="login-title m-0 mb-2 text-[2.15rem] font-extrabold leading-[1.15] tracking-[-0.03em] text-[#0f172a] max-[480px]:text-[1.75rem]">
                  Welcome Back
                </h1>
              </motion.div>
              </AnimatePresence>
            )}
          </div>

          {forgotPassword ? (
            <ForgotPasswordForm
              email={email}
              onEmailChange={setEmail}
              onBack={returnToSignIn}
              onComplete={completePasswordReset}
            />
          ) : (
            <form className="login-form flex w-full flex-col gap-7" onSubmit={handleLogin} noValidate>
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="login-fields-container flex w-full flex-col gap-7"
                >
                  {/* Email / Username field */}
                  <div className={`${loginFieldClassName} ${email ? 'has-value' : ''} ${emailFocused ? 'is-focused' : ''}`}>
                    <div className="login-floating-field__row flex min-h-[50px] items-end gap-3 pb-2">
                      <span className="login-floating-field__icon login-floating-field__icon--user flex shrink-0 items-center justify-center pb-1 text-[#8b1d2c] transition-colors duration-200" aria-hidden="true">
                        <User size={19} />
                      </span>
                      <div className="login-floating-field__input-wrap relative flex min-w-0 flex-1 flex-col justify-end">
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
                          className={loginInputClassName}
                        />
                        <label htmlFor="login-email" className={loginFloatingLabelClassName}>
                          Username <span className="login-required-star ml-0.5 font-bold text-red-500">*</span>
                        </label>
                      </div>
                    </div>
                    <div className="login-floating-field__line absolute bottom-0 left-0 right-0 h-[1.5px] overflow-hidden bg-[#e2e8f0] after:absolute after:inset-0 after:origin-center after:scale-x-0 after:bg-[#15803d] after:transition-transform after:duration-[250ms] after:[content:''] after:[transition-timing-function:cubic-bezier(0.2,0,0,1)]" />
                  </div>

                  {/* Password field */}
                  <div className={`${loginFieldClassName} ${password ? 'has-value' : ''} ${passwordFocused ? 'is-focused' : ''}`}>
                    <div className="login-floating-field__row flex min-h-[50px] items-end gap-3 pb-2">
                      <span className="login-floating-field__icon login-floating-field__icon--key flex shrink-0 items-center justify-center pb-1 text-[#64748b] transition-colors duration-200" aria-hidden="true">
                        <Lock size={19} />
                      </span>
                      <div className="login-floating-field__input-wrap relative flex min-w-0 flex-1 flex-col justify-end">
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
                          className={loginInputClassName}
                        />
                        <label htmlFor="login-password" className={loginFloatingLabelClassName}>
                          Password <span className="login-required-star ml-0.5 font-bold text-red-500">*</span>
                        </label>
                      </div>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((s) => !s)}
                        className="login-password-toggle-floating mb-[0.15rem] flex shrink-0 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-1 text-[#64748b] transition-colors duration-150 hover:text-[#0f172a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d]"
                      >
                        {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
                      </motion.button>
                    </div>
                    <div className="login-floating-field__line absolute bottom-0 left-0 right-0 h-[1.5px] overflow-hidden bg-[#e2e8f0] after:absolute after:inset-0 after:origin-center after:scale-x-0 after:bg-[#15803d] after:transition-transform after:duration-[250ms] after:[content:''] after:[transition-timing-function:cubic-bezier(0.2,0,0,1)]" />
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="login-options-row mb-1 mt-[-0.25rem] flex items-center justify-between max-[480px]:flex-col max-[480px]:items-start max-[480px]:gap-3">
                    <label className="login-remember flex cursor-pointer select-none items-center gap-2 text-[0.9rem] font-medium text-[#334155]">
                      <input
                        type="checkbox"
                        id="login-remember"
                        name="remember"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="m-0 h-[1.15rem] w-[1.15rem] cursor-pointer rounded-[4px] border-[1.5px] border-[#16a34a] accent-[#16a34a] !border-[#16a34a]"
                      />
                      <span>Remember Me</span>
                    </label>
                    <button
                      type="button"
                      className="login-forgot-link cursor-pointer border-0 bg-transparent p-0 text-[0.875rem] font-medium text-[#64748b] no-underline transition-colors duration-150 hover:text-[#15803d] hover:underline"
                      onClick={openPasswordReset}
                      disabled={loading}
                    >
                      Forgot password?
                    </button>
                  </div>
                </motion.div>
            {loginAttemptStatus && retryCountdown === 0 && (
              <p
                className={`login-attempts m-0 text-left text-[0.825rem] leading-[1.4] text-[#64748b]${loginAttemptStatus.remainingAttempts === 1 ? ' login-attempts--warning font-semibold text-[#ea580c]' : ''}`}
                role="status"
                aria-live="polite"
              >
                {loginAttemptStatus.remainingAttempts === 1
                  ? 'Warning: Only 1 login attempt remaining before temporary lockout.'
                  : `You have ${loginAttemptStatus.remainingAttempts} login attempts remaining.`}
              </p>
            )}

            <AnimatePresence>
              {retryCountdown > 0 && (
                <motion.div
                  className="login-lockout flex flex-wrap items-baseline justify-center gap-[0.35rem] rounded-[10px] border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-[0.85rem] leading-[1.4] text-[#9a3412] [&_strong]:font-bold [&_time]:[font-variant-numeric:tabular-nums] [&_time]:font-extrabold"
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
                  className="login-error flex items-start gap-[0.65rem] rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-[0.85rem] text-[#991b1b] [&_svg]:mt-[0.1rem] [&_svg]:h-5 [&_svg]:w-5 [&_svg]:flex-[0_0_1.25rem] [&_strong]:block [&_strong]:text-[0.875rem] [&_strong]:font-semibold [&_strong]:leading-[1.35] [&_p]:mt-[0.2rem] [&_p]:mb-0 [&_p]:text-[0.8125rem] [&_p]:leading-[1.45] [&_p]:text-[#7f1d1d] [&_p]:[overflow-wrap:anywhere]"
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
                  <AlertCircle size={20} className="login-error-icon mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <strong>We couldn’t sign you in</strong>
                    <p id="login-error-message">{errorMessage}</p>
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
                aria-label={loading ? 'Signing in…' : retryCountdown > 0 ? 'Please wait' : 'Sign in'}
                disabled={loading || retryCountdown > 0}
              >
                {loading && <RotateCw size={17} className="login-button-spinner animate-spin shrink-0 [animation-duration:0.9s]" aria-hidden="true" />}
                <span>
                  {loading ? 'Signing in…' : retryCountdown > 0 ? 'Please wait' : 'Log In'}
                </span>
              </motion.button>
            </div>
          </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
