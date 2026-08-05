import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '../utils/auth';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  function handleLogin() {
    setLoading(true);
    signIn();
    setTimeout(() => {
      navigate('/community');
    }, 250);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Sign In</h1>
        <p>Development login: click to continue directly to Community.</p>
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
