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
    apiAuth.refreshSession().then((data) => {
      setToken(data.token);
      setCurrentUser(data.user || null);
    }).catch(() => {
      apiAuth.clearToken();
    }).finally(() => {
      setLoading(false);
    });
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
    apiAuth.logoutSession().catch(() => {});
    apiAuth.clearToken();
    setToken(null);
    setCurrentUser(null);
  };

  const updateCurrentUser = (updates) => {
    setCurrentUser((current) => (current ? { ...current, ...updates } : current));
  };

  const value = {
    token,
    currentUser,
    loading,
    login,
    logout,
    updateCurrentUser,
    isAuthenticated: Boolean(currentUser),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
