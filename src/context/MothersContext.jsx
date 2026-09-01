import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const MothersContext = createContext(null);
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:4000';

export function MothersProvider({ children }) {
  const [mothers, setMothers] = useState([]);

  const loadMothers = useCallback(async (fields = []) => {
    try {
      const params = new URLSearchParams();
      if (Array.isArray(fields) && fields.length) {
        params.set('fields', fields.join(','));
      }
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${API_BASE}/api/mothers${queryString}`, { headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) {
        throw new Error('Failed to load mothers');
      }

      const payload = await response.json();
      const nextMothers = Array.isArray(payload) ? payload : (payload.mothers || []);
      setMothers(nextMothers);
      return nextMothers;
    } catch (error) {
      console.error('[MothersContext] Unable to load mothers from database:', error);
      setMothers([]);
      return [];
    }
  }, []);

  useEffect(() => {
    let active = true;

    const run = async () => {
      const nextMothers = await loadMothers();
      if (!active) return;
      setMothers(nextMothers);
    };

    run();
    return () => { active = false; };
  }, [loadMothers]);

  const value = useMemo(() => ({ mothers, setMothers, refreshMothers: loadMothers }), [mothers, loadMothers]);

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
