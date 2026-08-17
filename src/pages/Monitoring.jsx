import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Monitoring() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};
  const mother = state.mother || null;

  const openCheckup = () => {
    // placeholder for opening a specific checkup editor
    alert('Open checkup editor (not implemented)');
  };

  return (
    <div className="monitoring-page">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Monitoring</h1>
        {mother && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700 }}>{mother.name || mother.motherName || mother.firstName}</div>
            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{mother.motherId || mother.id || ''}</div>
            <div style={{ marginTop: 6 }}>
              <button type="button" className="btn-secondary" onClick={() => navigate('/beneficiary')}>Back to profile</button>
            </div>
          </div>
        )}
      </header>

      <section style={{ marginTop: 18 }}>
        <h2>Monitoring Workspace</h2>
        <p>This is the monitoring workspace where check-ups, trimester tracking, immunization scheduling, and longitudinal records will be managed.</p>
        <div style={{ marginTop: 12 }}>
          <button type="button" className="btn-primary" onClick={openCheckup}>Add Check-up (placeholder)</button>
        </div>

        <div style={{ marginTop: 18 }}>
          <h3>Timeline (placeholder)</h3>
          <p>Timeline and list of saved check-ups will appear here.</p>
        </div>
      </section>
    </div>
  );
}
