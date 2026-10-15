import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthProvider';
import { canViewAuditSignatures } from '../../../utils/permissions';
import MotherCheckup from './MotherCheckup';

export default function MotherMonitoringPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const showAuditSignatures = canViewAuditSignatures(currentUser?.role);
  const mother = location.state?.mother || null;

  return (
    <div className="community-page">
      <header className="community-header">
        <div className="community-title-section">
          <h1>Monitoring</h1>
          <p style={{ margin: 0 }}>{mother ? mother.name || mother.motherName : 'Mother'}</p>
        </div>
        <div>
          <button className="btn-secondary back-action" onClick={() => navigate(-1)}>Back</button>
        </div>
      </header>

      <main className="beneficiary-main">
        <MotherCheckup
          mother={mother || { id, name: 'Mother' }}
          showAuditSignatures={showAuditSignatures}
          onSave={() => navigate(-1)}
          onCancel={() => navigate(-1)}
        />
      </main>
    </div>
  );
}
