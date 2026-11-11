import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as apiAuth from '../api/auth';
import {
  apiGetGuidancePreferences,
  apiResetGuidancePreferences,
  apiSaveGuidancePreferences,
} from '../api/guidancePreferences';
import { normalizeGuidancePreferences } from '../guides/guidancePreferences.mjs';
import { shouldLoadGuidancePreferences } from './guidanceAccess.mjs';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guidancePreferences, setGuidancePreferences] = useState(null);
  const [guidancePreferencesLoading, setGuidancePreferencesLoading] = useState(false);
  const [guidancePreferencesError, setGuidancePreferencesError] = useState('');
  const [guidanceResetSequence, setGuidanceResetSequence] = useState(0);
  const guidanceRequestId = useRef(0);
  const guidanceWriteQueue = useRef(Promise.resolve());

  const loadGuidancePreferences = useCallback(async (user) => {
    if (!shouldLoadGuidancePreferences(user)) {
      setGuidancePreferences(null);
      setGuidancePreferencesError('');
      setGuidancePreferencesLoading(false);
      return false;
    }
    const requestId = ++guidanceRequestId.current;
    setGuidancePreferencesLoading(true);
    setGuidancePreferencesError('');
    try {
      const response = await apiGetGuidancePreferences();
      if (requestId !== guidanceRequestId.current) return false;
      setGuidancePreferences(normalizeGuidancePreferences(response.preferences));
      return true;
    } catch (error) {
      if (requestId === guidanceRequestId.current) {
        setGuidancePreferencesError(error.message || 'Unable to load help and guidance preferences');
      }
      return false;
    } finally {
      if (requestId === guidanceRequestId.current) setGuidancePreferencesLoading(false);
    }
  }, []);

  useEffect(() => {
    apiAuth.refreshSession().then(async (data) => {
      if (data?.token) {
        setToken(data.token);
        setCurrentUser(data.user || null);
        if (shouldLoadGuidancePreferences(data.user)) {
          await loadGuidancePreferences(data.user);
        }
      }
    }).catch(() => {
      apiAuth.clearToken();
      setGuidancePreferences(null);
    }).finally(() => {
      setLoading(false);
    });
  }, [loadGuidancePreferences]);

  const login = async (email, password) => {
    const data = await apiAuth.login(email, password);
    if (data && data.token) {
      apiAuth.saveToken(data.token);
      setToken(data.token);
      setCurrentUser(data.user || null);
      if (shouldLoadGuidancePreferences(data.user)) {
        await loadGuidancePreferences(data.user);
      }
      return data.user;
    }
    throw new Error('Login failed');
  };

  const acceptConsent = async () => {
    await apiAuth.acceptConsent();
    setCurrentUser((user) => user ? { ...user, has_accepted_terms: true } : user);
  };

  const logout = () => {
    apiAuth.logoutSession().catch(() => {});
    apiAuth.clearToken();
    setToken(null);
    setCurrentUser(null);
    guidanceRequestId.current += 1;
    setGuidancePreferences(null);
    setGuidancePreferencesError('');
    setGuidancePreferencesLoading(false);
    setGuidanceResetSequence(0);
  };

  const updateCurrentUser = (updates) => {
    setCurrentUser((current) => (current ? { ...current, ...updates } : current));
  };

  const saveGuidancePreferences = async (updates) => {
    if (!currentUser?.id) throw new Error('Sign in to update help and guidance preferences');
    const userId = currentUser.id;
    const requestId = ++guidanceRequestId.current;
    setGuidancePreferencesLoading(true);
    setGuidancePreferencesError('');
    try {
      const request = guidanceWriteQueue.current
        .catch(() => undefined)
        .then(() => apiSaveGuidancePreferences(updates));
      guidanceWriteQueue.current = request;
      const response = await request;
      const next = normalizeGuidancePreferences(response.preferences);
      if (requestId === guidanceRequestId.current && userId === currentUser.id) {
        setGuidancePreferences(next);
      }
      return next;
    } catch (error) {
      if (requestId === guidanceRequestId.current) {
        setGuidancePreferencesError(error.message || 'Unable to save help and guidance preferences');
      }
      throw error;
    } finally {
      if (requestId === guidanceRequestId.current) setGuidancePreferencesLoading(false);
    }
  };

  const resetGuidancePreferences = async () => {
    if (!currentUser?.id) throw new Error('Sign in to reset help and guidance preferences');
    const userId = currentUser.id;
    const requestId = ++guidanceRequestId.current;
    setGuidancePreferencesLoading(true);
    setGuidancePreferencesError('');
    try {
      const request = guidanceWriteQueue.current
        .catch(() => undefined)
        .then(() => apiResetGuidancePreferences());
      guidanceWriteQueue.current = request;
      const response = await request;
      const next = normalizeGuidancePreferences(response.preferences);
      if (requestId === guidanceRequestId.current && userId === currentUser.id) {
        setGuidancePreferences(next);
        setGuidanceResetSequence((sequence) => sequence + 1);
      }
      return next;
    } catch (error) {
      if (requestId === guidanceRequestId.current) {
        setGuidancePreferencesError(error.message || 'Unable to reset help and guidance preferences');
      }
      throw error;
    } finally {
      if (requestId === guidanceRequestId.current) setGuidancePreferencesLoading(false);
    }
  };

  const value = {
    token,
    currentUser,
    loading,
    login,
    acceptConsent,
    logout,
    updateCurrentUser,
    guidancePreferences,
    guidancePreferencesLoading,
    guidancePreferencesError,
    guidanceResetSequence,
    loadGuidancePreferences,
    saveGuidancePreferences,
    resetGuidancePreferences,
    isAuthenticated: Boolean(currentUser),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
