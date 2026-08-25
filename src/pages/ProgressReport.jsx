import React, { useEffect, useMemo, useState } from 'react';
import { apiGetChildren } from '../api/children';
import { useMothers } from '../context/MothersContext';

const getMotherProgress = (mother) => Math.round([
  mother.firstName || mother.first_name,
  mother.lastName || mother.last_name,
  mother.dob,
  mother.community || mother.area,
  mother.birthCertificateDocumentPath || mother.birth_certificate_document_path,
  mother.consentDocumentPath || mother.consent_document_path,
].filter(Boolean).length * (100 / 6));

const getChildProgress = (child) => Math.round([
  child.mother_id || child.motherId,
  child.first_name || child.firstName,
  child.last_name || child.lastName,
  child.birthDocumentPath || child.birth_document_path,
].filter(Boolean).length * 25);

const getStatus = (progress) => progress === 100 ? 'Complete' : progress ? 'Incomplete' : 'Missing';

function ProgressBar({ progress }) {
  return <div className="profile-progress"><span className="profile-progress-track"><span style={{ width: `${progress}%` }} /></span><strong>{progress}%</strong></div>;
}

export default function ProgressReport() {
  const { mothers } = useMothers();
  const [children, setChildren] = useState([]);
  const [entity, setEntity] = useState('Mothers');

  useEffect(() => {
    apiGetChildren().then((response) => setChildren(response?.children || [])).catch(() => setChildren([]));
  }, []);

  const rows = useMemo(() => entity === 'Mothers'
    ? mothers.map((mother) => ({
      id: mother.motherId || mother.id,
      name: mother.name || [mother.firstName, mother.lastName].filter(Boolean).join(' '),
      type: 'Mother profile',
      progress: getMotherProgress(mother),
      missing: [
        !mother.firstName && !mother.first_name ? 'First name' : null,
        !mother.lastName && !mother.last_name ? 'Last name' : null,
        !mother.dob ? 'Date of birth' : null,
        !(mother.community || mother.area) ? 'School' : null,
        !(mother.birthCertificateDocumentPath || mother.birth_certificate_document_path) ? 'Birth certificate' : null,
        !(mother.consentDocumentPath || mother.consent_document_path) ? 'Program consent' : null,
      ].filter(Boolean),
    }))
    : children.map((child) => ({
      id: child.child_code || child.id,
      name: [child.first_name, child.middle_name, child.last_name].filter(Boolean).join(' '),
      type: 'Child profile',
      progress: getChildProgress(child),
      missing: [
        !child.mother_id && !child.motherId ? 'Mother association' : null,
        !child.first_name && !child.firstName ? 'First name' : null,
        !child.last_name && !child.lastName ? 'Last name' : null,
        !(child.birthDocumentPath || child.birth_document_path) ? 'Birth certificate' : null,
      ].filter(Boolean),
    })), [children, entity, mothers]);

  const complete = rows.filter((row) => row.progress === 100).length;
  const average = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.progress, 0) / rows.length) : 0;

  return (
    <div className="community-page progress-report-page">
      <header className="community-header"><div className="community-title-section"><h1>Progress Report</h1><nav className="community-breadcrumb" aria-label="Breadcrumb"><span className="breadcrumb-current">Progress Report</span></nav></div></header>
      <section className="progress-report-summary"><div><span>Total profiles</span><strong>{rows.length}</strong></div><div><span>Complete profiles</span><strong>{complete}</strong></div><div><span>Average profile progress</span><strong>{average}%</strong></div></section>
      <section className="progress-report-content">
        <div className="progress-report-toolbar"><div className="progress-report-tabs" role="tablist" aria-label="Profile type">{['Mothers', 'Children'].map((option) => <button key={option} type="button" role="tab" aria-selected={entity === option} className={entity === option ? 'active' : ''} onClick={() => setEntity(option)}>{option}</button>)}</div><p>Profile completeness only. Monitoring checkups are tracked in Monitor.</p></div>
        <div className="table-card progress-report-table-card"><div className="table-overflow"><table className="data-table"><thead><tr><th>Beneficiary</th><th>Profile progress</th><th>Status</th><th>Missing required fields</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id}><td><strong>{row.name || 'Unnamed beneficiary'}</strong><span className="progress-report-meta">{row.id} · {row.type}</span></td><td><ProgressBar progress={row.progress} /></td><td><span className={`profile-report-status ${row.progress === 100 ? 'complete' : 'incomplete'}`}>{getStatus(row.progress)}</span></td><td>{row.missing.length ? row.missing.join(', ') : 'None'}</td></tr>) : <tr><td colSpan="4" className="no-data">No beneficiary profiles found.</td></tr>}</tbody></table></div></div>
      </section>
    </div>
  );
}
