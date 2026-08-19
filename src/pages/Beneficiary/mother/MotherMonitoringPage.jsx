import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import MotherCheckup from './MotherCheckup';

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
        <MotherCheckup
          mother={mother || { id, name: `Mother ID: ${id}` }}
          onSave={() => navigate(-1)}
          onCancel={() => navigate(-1)}
        />
      </main>
    </div>
  );
}
