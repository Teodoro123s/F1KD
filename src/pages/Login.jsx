import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/f1kd-logo.png';
import { useAuth } from '../auth/AuthProvider';
import { notifyAction } from '../components/ActionFeedback';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const auth = useAuth();

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await auth.login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed', err);
      const message = err.message || 'Login failed. Please check your credentials and try again.';
      setErrorMessage(message);
      notifyAction(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-kicker">
          <img src={logo} alt="F1KD logo" className="login-logo" />
        </div>
        <h1 className="login-title">Welcome back</h1>

        <form className="login-form" onSubmit={handleLogin} noValidate>
          <div className="login-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => { setEmail(event.target.value); setErrorMessage(''); }}
              placeholder="Enter email"
              autoComplete="username"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <div className="login-password-wrap">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => { setPassword(event.target.value); setErrorMessage(''); }}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((s) => !s)}
                className="btn-icon"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}

          <div className="login-actions">
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
