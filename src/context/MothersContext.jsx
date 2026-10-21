import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchWithAuth, getApiBaseUrl } from '../api/authHeader';
import { useAuth } from '../auth/AuthProvider';
import { normalizeRole, ROLES } from '../utils/permissions';

const MothersContext = createContext(null);
const API_BASE = getApiBaseUrl();

export function MothersProvider({ children }) {
  const auth = useAuth();
  const [mothers, setMothers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);

  const loadMothers = useCallback(async (fields = []) => {
    const requestId = ++requestVersion.current;
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (Array.isArray(fields) && fields.length) {
        params.set('fields', fields.join(','));
      }
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await fetchWithAuth(`${API_BASE}/api/mothers${queryString}`, { headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) {
        throw new Error('Failed to load mothers');
      }
      const payload = await response.json();
      const nextMothers = Array.isArray(payload) ? payload : (payload.mothers || []);
      if (requestId === requestVersion.current) {
        setMothers(nextMothers);
      }
      return nextMothers;
    } catch (error) {
      console.error('[MothersContext] Unable to load mothers from database:', error);
      if (requestId === requestVersion.current) {
        setMothers([]);
        setError('Unable to load mothers. Please try again.');
      }
      return [];
    } finally {
      if (requestId === requestVersion.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (auth.loading || !auth.currentUser) return undefined;
    if (normalizeRole(auth.currentUser.role) === ROLES.SUPER_ADMIN) {
      requestVersion.current += 1;
      setMothers([]);
      setError('');
      setLoading(false);
      return undefined;
    }
    loadMothers();
    return () => {
      requestVersion.current += 1;
    };
  }, [auth.currentUser, auth.loading, auth.token, loadMothers]);

  const value = useMemo(
    () => ({ mothers, setMothers, loading, error, refreshMothers: loadMothers }),
    [mothers, loading, error, loadMothers],
  );

  return (
    <MothersContext.Provider value={value}>
      {children}
    </MothersContext.Provider>
  );
}

export function useMothers() {
  const ctx = useContext(MothersContext);
  if (!ctx) throw new Error('useMothers must be used within MothersProvider');
  return ctx;
}
