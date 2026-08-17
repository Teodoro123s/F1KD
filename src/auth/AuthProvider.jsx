import React, { createContext, useContext, useEffect, useState } from 'react';
import * as apiAuth from '../api/auth';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // on mount, try to load token from localStorage
    const t = apiAuth.loadToken();
    if (t) {
      setToken(t);
      // Decode token payload locally to populate currentUser quickly (avoid relying on /me endpoint)
      try {
        const parts = t.split('.');
        if (parts.length >= 2) {
          const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
          const payload = JSON.parse(atob(padded));
          setCurrentUser(payload || null);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Failed to decode token payload', err);
      }
      // fallback: try validating with /me
      apiAuth.me(t).then((data) => {
        setCurrentUser(data.user || null);
        setLoading(false);
      }).catch((err) => {
        console.warn('Failed to validate saved token', err);
        apiAuth.clearToken();
        setToken(null);
        setCurrentUser(null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await apiAuth.login(email, password);
    if (data && data.token) {
      apiAuth.saveToken(data.token);
      setToken(data.token);
      setCurrentUser(data.user || null);
      return data.user;
    }
    throw new Error('Login failed');
  };

  const logout = () => {
    apiAuth.clearToken();
    setToken(null);
    setCurrentUser(null);
  };

  const value = {
    token,
    currentUser,
    loading,
    login,
    logout,
    isAuthenticated: Boolean(currentUser),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
