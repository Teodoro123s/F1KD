import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const auth = useAuth();

  async function handleLogin() {
    setLoading(true);
    try {
      // Use email as the credential for login
      await auth.login(email, password);
      navigate('/dashboard');
    } catch (err) {
      // show error
      console.error('Login failed', err);
      alert(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Sign In</h1>
        <p>Enter your email and password to continue.</p>
        <label>
          Email
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter email"
          />
        </label>
        <label>
          Password
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((s) => !s)}
              className="btn-icon"
              style={{ marginLeft: 8 }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>
        <div className="login-actions">
          <button
            type="button"
            className="login-button"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
