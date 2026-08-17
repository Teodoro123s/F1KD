import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form onSubmit={submit} className="login-form">
        <h2>Sign in</h2>
        {error && <div className="form-error">{error}</div>}
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required style={{ flex: 1 }} />
            <button type="button" className="btn-icon" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((s) => !s)} style={{ marginLeft: 8 }}>{showPassword ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        </div>
      </form>
    </div>
  );
}
