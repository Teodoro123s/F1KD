import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Monitoring() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state || {};
  const mother = state.mother || null;

  const openCheckup = () => {
    if (!mother?.id) return;
    navigate(`/beneficiary/mother/${mother.id}/monitoring`, { state: { mother } });
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
          <button type="button" className="btn-primary" onClick={openCheckup} disabled={!mother?.id}>Add Check-up</button>
        </div>

        <div style={{ marginTop: 18 }}>
          <h3>Timeline</h3>
          <p>Select a mother to view and add check-ups.</p>
        </div>
      </section>
    </div>
  );
}
