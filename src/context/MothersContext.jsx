import React, { createContext, useContext, useEffect, useState } from 'react';

const MothersContext = createContext(null);
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:4000';

export function MothersProvider({ children }) {
  const [mothers, setMothers] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadMothers() {
      try {
        const response = await fetch(`${API_BASE}/api/mothers`, { headers: { 'Content-Type': 'application/json' } });
        if (!response.ok) {
          throw new Error('Failed to load mothers');
        }

        const payload = await response.json();
        const nextMothers = Array.isArray(payload) ? payload : (payload.mothers || []);

        if (active) {
          setMothers(nextMothers);
        }
      } catch (error) {
        console.error('[MothersContext] Unable to load mothers from database:', error);
        if (active) setMothers([]);
      }
    }

    loadMothers();
    return () => { active = false; };
  }, []);

  return (
    <MothersContext.Provider value={{ mothers, setMothers }}>
      {children}
    </MothersContext.Provider>
  );
}

export function useMothers() {
  const ctx = useContext(MothersContext);
  if (!ctx) throw new Error('useMothers must be used within MothersProvider');
  return ctx;
}
