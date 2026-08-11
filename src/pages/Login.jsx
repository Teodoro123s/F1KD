import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '../utils/auth';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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
        <p>Enter your username and password to continue.</p>
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter username"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
          />
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
