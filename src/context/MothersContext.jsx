import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiGetMothers } from '../api/mothers';
import { useAuth } from '../auth/AuthProvider';
import { normalizeRole, ROLES } from '../utils/permissions';

const MothersContext = createContext(null);

export function MothersProvider({ children }) {
  const auth = useAuth();
  const { pathname } = useLocation();
  const [mothers, setMothers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);
  const mothersRef = useRef(mothers);

  const loadMothers = useCallback(async (fields = []) => {
    const requestId = ++requestVersion.current;
    setLoading(true);
    setError('');

    try {
      const payload = await apiGetMothers(fields);
      const nextMothers = Array.isArray(payload) ? payload : (payload.mothers || []);
      if (requestId === requestVersion.current) {
        mothersRef.current = nextMothers;
        setMothers(nextMothers);
      }
      return nextMothers;
    } catch (error) {
      console.error('[MothersContext] Unable to load mothers from database:', error);
      if (requestId === requestVersion.current) {
        // Keep the last successful snapshot visible while the refresh is failing.
        setError('Unable to load mothers. Please try again.');
      }
      return mothersRef.current;
    } finally {
      if (requestId === requestVersion.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (auth.loading || !auth.currentUser) return undefined;
    if (pathname !== '/beneficiary/create/child') {
      requestVersion.current += 1;
      mothersRef.current = [];
      setMothers([]);
      setError('');
      setLoading(false);
      return undefined;
    }
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
  }, [auth.currentUser, auth.loading, auth.token, loadMothers, pathname]);

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
