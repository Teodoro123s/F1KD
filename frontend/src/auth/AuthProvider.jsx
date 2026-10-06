import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as apiAuth from '../api/auth';
import { getTokenExpiration, isTokenExpired } from '../utils/sessionToken.mjs';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function initializeSession() {
      const savedToken = apiAuth.loadToken();
      if (!savedToken) {
        setLoading(false);
        return;
      }

      if (isTokenExpired(savedToken)) {
        apiAuth.clearToken();
        setLoading(false);
        return;
      }

      try {
        const session = await apiAuth.me(savedToken);
        if (!active) return;
        if (!session?.user) throw new Error('Session validation returned no user');
        setToken(savedToken);
        setCurrentUser(session.user);
      } catch (validationError) {
        if (!active) return;
        console.warn('Unable to validate saved session', validationError);
        apiAuth.clearToken();
        setToken(null);
        setCurrentUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    initializeSession();
    return () => { active = false; };
  }, []);

  const logout = useCallback(() => {
    apiAuth.clearToken();
    setToken(null);
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => logout();
    window.addEventListener('f1kd:session-expired', handleExpiredSession);
    return () => window.removeEventListener('f1kd:session-expired', handleExpiredSession);
  }, [logout]);

  useEffect(() => {
    if (!token) return undefined;

    const expiration = getTokenExpiration(token);
    if (!expiration) {
      logout();
      return undefined;
    }

    const timeout = window.setTimeout(logout, Math.max(0, expiration - Date.now()));

    return () => window.clearTimeout(timeout);
  }, [logout, token]);

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
