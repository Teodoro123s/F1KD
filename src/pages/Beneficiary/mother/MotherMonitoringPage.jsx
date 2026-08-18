import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';

export default function MotherMonitoringPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const mother = location.state?.mother || null;

  return (
    <div className="community-page">
      <header className="community-header">
        <div className="community-title-section">
          <h1>Monitoring</h1>
          <p style={{ margin: 0 }}>{mother ? mother.name || mother.motherName : `Mother ID: ${id}`}</p>
        </div>
        <div>
          <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
        </div>
      </header>

      <main className="beneficiary-main">
        <section>
          <h2>Monitoring Workspace (Static)</h2>
          <p>This is a placeholder monitoring workspace for mother <strong>{mother?.name || id}</strong>. Implement check-up lists, timeline, and forms here.</p>
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn-primary" onClick={() => alert('Add check-up (not implemented)')}>Add Check-up</button>
          </div>
        </section>
      </main>
    </div>
  );
}
