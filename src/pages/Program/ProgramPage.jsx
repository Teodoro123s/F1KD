import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BatchesIcon, GroupsIcon, PlusIcon, SearchIcon } from '../Community/CommunityIcons';

const initialPrograms = [
  { id: 1, name: 'Milo Feeding Program', type: 'Feeding', provider: 'Milo', community: 'Cebu Community', batch: 'March Batch', status: 'Active', target: 24, received: 20, activities: 6, latest: 'Aug 26, 2026', ended: '', recipients: ['Maria Santos', 'Juan Dela Cruz', 'Ana Garcia', 'Pedro Reyes', 'Carlo Ramos'] },
  { id: 2, name: 'Milk Subsidy', type: 'Milk Subsidy', provider: 'Partner A', community: 'Cebu Community', batch: 'April Batch', status: 'Active', target: 30, received: 26, activities: 4, latest: 'Aug 22, 2026', ended: '', recipients: ['Liam Cruz', 'Sofia Reyes', 'Noah Garcia'] },
  { id: 3, name: 'Vitamin Support 2026', type: 'Vitamin / Supplement', provider: 'Municipal Health Office', community: 'Cebu Community', batch: 'January Batch', status: 'Ended', target: 18, received: 18, activities: 8, latest: 'Jul 30, 2026', ended: 'Jul 30, 2026', recipients: ['Maria Santos', 'Ana Cruz', 'Mark Santos'] },
];

const emptyProgram = { name: '', type: 'Feeding', provider: '', community: '', batch: '', beneficiaryType: 'Mother and Child', description: '' };

export default function ProgramPage() {
  const navigate = useNavigate();
  const { programId } = useParams();
  const [activeTab, setActiveTab] = useState('Active');
  const [query, setQuery] = useState('');
  const [programs, setPrograms] = useState(initialPrograms);
  const [viewMode, setViewMode] = useState(Boolean(programId));
  const [showModal, setShowModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [form, setForm] = useState(emptyProgram);
  const [activityStatus, setActivityStatus] = useState('Open');
  const [checkedRecipients, setCheckedRecipients] = useState(['Maria Santos', 'Juan Dela Cruz', 'Ana Garcia', 'Carlo Ramos']);
  const [beneficiaryScope, setBeneficiaryScope] = useState('School');
  const [scopeName, setScopeName] = useState('');

  const filteredPrograms = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return programs.filter((program) => program.status === activeTab);
    return programs.filter((program) => program.status === activeTab && `${program.name} ${program.type} ${program.provider} ${program.community} ${program.batch}`.toLowerCase().includes(term));
  }, [programs, query, activeTab]);

  const saveProduct = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.provider.trim()) return;
    setPrograms((current) => [...current, { ...form, id: Date.now(), name: form.name.trim(), provider: form.provider.trim(), status: 'Active', target: 0, received: 0, activities: 0, latest: 'No activity yet', ended: '', recipients: [] }]);
    setForm(emptyProgram);
    setShowModal(false);
  };

  const selectedProgram = programs.find((program) => program.id === Number(programId)) || programs.find((program) => program.id === Number(form.id)) || filteredPrograms[0];
  const toggleRecipient = (recipient) => setCheckedRecipients((current) => current.includes(recipient) ? current.filter((name) => name !== recipient) : [...current, recipient]);
  const saveActivity = (event) => {
    event.preventDefault();
    if (!selectedProgram) return;
    setPrograms((current) => current.map((program) => program.id === selectedProgram.id ? { ...program, received: Math.min(program.target, Math.max(program.received, checkedRecipients.length)), activities: program.activities + 1, latest: 'Aug 26, 2026' } : program));
    setShowActivityModal(false);
  };
  const endProgram = () => {
    if (!selectedProgram) return;
    setPrograms((current) => current.map((program) => program.id === selectedProgram.id ? { ...program, status: 'Ended', ended: 'Aug 26, 2026' } : program));
    setForm(emptyProgram);
  };
  const saveBeneficiaryScope = (event) => {
    event.preventDefault();
    if (!selectedProgram || !scopeName.trim()) return;
    setPrograms((current) => current.map((program) => program.id === selectedProgram.id ? { ...program, scopeType: beneficiaryScope, scopeName: scopeName.trim() } : program));
    setShowBeneficiaryModal(false);
    setScopeName('');
  };

  return (
    <div className="community-page program-page">
      <header className="community-header">
        <div className="community-title-section">
          <h1>{viewMode && selectedProgram ? selectedProgram.name : 'Program'}</h1>
          <nav className="community-breadcrumb" aria-label="Breadcrumb">
            <span className="breadcrumb-current">Program</span>
          </nav>
        </div>
        <button className="btn-create-action" type="button" onClick={() => viewMode ? setShowBeneficiaryModal(true) : setShowModal(true)}>
          <PlusIcon />
          <span>{viewMode ? 'Add beneficiary' : 'Create Program'}</span>
        </button>
      </header>

      {!viewMode && <section className="tabs-row program-tabs-row">
        <div className="tabs-list" role="tablist" aria-label="Program sections">
          <button type="button" role="tab" aria-selected={activeTab === 'Active'} className={`tab-btn${activeTab === 'Active' ? ' active' : ''}`} onClick={() => setActiveTab('Active')}>
            <GroupsIcon /><span>Active Programs</span>
          </button>
          <button type="button" role="tab" aria-selected={activeTab === 'Ended'} className={`tab-btn${activeTab === 'Ended' ? ' active' : ''}`} onClick={() => setActiveTab('Ended')}>
            <BatchesIcon /><span>Ended Programs</span>
          </button>
        </div>
        <div className="search-container program-search">
          <div className="search-field-container">
            <SearchIcon />
            <input id="program-search" name="programSearch" type="text" className="search-input-field" placeholder="Search programs, partners, or communities..." value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search programs" />
          </div>
        </div>
      </section>}

      <section className="table-card program-table-card">
        <div className="table-overflow">
          <table className="data-table">
            {viewMode ? <><thead><tr><th>Beneficiary</th><th>Scope</th><th>Program status</th><th>Latest activity</th><th>Distribution status</th></tr></thead><tbody>{selectedProgram?.recipients.map((recipient, index) => <tr key={recipient}><td><strong>{recipient}</strong><span className="program-table-meta">Beneficiary #{index + 1}</span></td><td>{selectedProgram.community} · {selectedProgram.batch}</td><td><span className="program-status active">Covered</span></td><td>{selectedProgram.latest}</td><td><span className={`program-recipient-status ${index < selectedProgram.received ? 'received' : 'pending'}`}>{index < selectedProgram.received ? 'Received' : 'Not yet recorded'}</span></td></tr>)}</tbody></> : <><thead><tr><th>Program</th><th>Type</th><th>Provider</th><th>Reached</th><th>Latest activity</th><th>Action</th></tr></thead><tbody>{filteredPrograms.length ? filteredPrograms.map((program) => <tr key={program.id}><td><strong>{program.name}</strong><span className="program-table-meta">{program.community} · {program.batch}</span></td><td>{program.type}</td><td>{program.provider}</td><td>{program.received} / {program.target}</td><td>{program.latest}</td><td><button type="button" className="btn-secondary program-action-button" onClick={() => { setForm(program); setViewMode(true); navigate(`/program/${program.id}`); }}>View program</button></td></tr>) : <tr><td colSpan="6" className="no-data">No programs match your search.</td></tr>}</tbody></>}
          </table>
        </div>
      </section>

      {selectedProgram && <section className="program-detail-panel">
        <div className="program-detail-header"><div><span className="program-kicker">Program overview</span><h2>{selectedProgram.name}</h2><p>{selectedProgram.provider} · {selectedProgram.type}</p></div><span className={`program-status ${selectedProgram.status === 'Active' ? 'active' : 'ended'}`}>{selectedProgram.status}</span></div>
        <div className="program-detail-stats"><div><strong>{selectedProgram.target}</strong><span>Target beneficiaries</span></div><div><strong>{selectedProgram.received}</strong><span>Reached</span></div><div><strong>{Math.round((selectedProgram.received / Math.max(selectedProgram.target, 1)) * 100)}%</strong><span>Completion</span></div><div><strong>{selectedProgram.activities}</strong><span>Activities</span></div></div>
        <div className="program-detail-meta"><span>Coverage cluster</span><strong>{selectedProgram.scopeType ? `${selectedProgram.scopeType}: ${selectedProgram.scopeName}` : `${selectedProgram.community} · ${selectedProgram.batch}`}</strong><span>Beneficiary type</span><strong>{selectedProgram.beneficiaryType || 'Mother and Child'}</strong></div>
        <div className="program-detail-actions">{selectedProgram.status === 'Active' && <><button type="button" className="btn-primary" onClick={() => setShowActivityModal(true)}><PlusIcon /> Record activity</button><button type="button" className="btn-secondary" onClick={endProgram}>End program</button></>}{selectedProgram.status === 'Ended' && <span className="program-ended-note">Ended {selectedProgram.ended}. Historical records are read-only.</span>}</div>
      </section>}

      {showBeneficiaryModal && selectedProgram && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowBeneficiaryModal(false)}><form className="modal program-product-modal" onSubmit={saveBeneficiaryScope} onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><h2>Add beneficiary cluster</h2><button type="button" className="modal-close" onClick={() => setShowBeneficiaryModal(false)} aria-label="Close">×</button></div><div className="modal-body"><p className="program-modal-context">{selectedProgram.name} · Choose the coverage cluster for this program.</p><fieldset className="program-scope-options"><legend>Beneficiary scope</legend><label><input type="radio" name="beneficiary-scope" value="School" checked={beneficiaryScope === 'School'} onChange={(event) => setBeneficiaryScope(event.target.value)} /><span>Whole school / community</span><small>Cover all eligible beneficiaries in this school or community.</small></label><label><input type="radio" name="beneficiary-scope" value="Group" checked={beneficiaryScope === 'Group'} onChange={(event) => setBeneficiaryScope(event.target.value)} /><span>Group</span><small>Cover one group within the school or community.</small></label><label><input type="radio" name="beneficiary-scope" value="Batch" checked={beneficiaryScope === 'Batch'} onChange={(event) => setBeneficiaryScope(event.target.value)} /><span>Batch</span><small>Cover one batch within the selected group.</small></label></fieldset><label className="form-label" htmlFor="beneficiary-scope-name">School, community, group, or batch name<input id="beneficiary-scope-name" className="form-input" value={scopeName} onChange={(event) => setScopeName(event.target.value)} placeholder={beneficiaryScope === 'School' ? 'e.g. Cebu Community' : beneficiaryScope === 'Group' ? 'e.g. March Group' : 'e.g. March Batch'} required /></label><p className="program-scope-note">Beneficiaries will be included by this cluster. Individual selection is not required.</p></div><div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setShowBeneficiaryModal(false)}>Cancel</button><button type="submit" className="btn-primary">Add beneficiary cluster</button></div></form></div>}
      {showModal && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowModal(false)}><form className="modal program-product-modal" onSubmit={saveProduct} onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><h2>Create program</h2><button type="button" className="modal-close" onClick={() => setShowModal(false)} aria-label="Close">×</button></div><div className="modal-body"><label className="form-label" htmlFor="program-name">Program name<input id="program-name" className="form-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label className="form-label" htmlFor="program-type">Program type<select id="program-type" className="form-select" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Feeding</option><option>Milk Subsidy</option><option>Vitamin / Supplement</option><option>Third-party Support</option><option>Other</option></select></label><label className="form-label" htmlFor="program-provider">Provider / partner<input id="program-provider" className="form-input" value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} required /></label><label className="form-label" htmlFor="program-description">Description<textarea id="program-description" className="form-input" rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label className="form-label" htmlFor="program-beneficiary-type">Beneficiary type<select id="program-beneficiary-type" className="form-select" value={form.beneficiaryType} onChange={(event) => setForm({ ...form, beneficiaryType: event.target.value })}><option>Mother</option><option>Child</option><option>Mother and Child</option></select></label></div><div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn-primary">Create active program</button></div></form></div>}
      {showActivityModal && selectedProgram && <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowActivityModal(false)}><form className="modal program-product-modal" onSubmit={(event) => { event.preventDefault(); setShowActivityModal(false); }} onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><h2>Record activity</h2><button type="button" className="modal-close" onClick={() => setShowActivityModal(false)} aria-label="Close">×</button></div><div className="modal-body"><p className="program-modal-context">{selectedProgram.name} · {selectedProgram.community} · {selectedProgram.batch}</p><label className="form-label" htmlFor="activity-date">Activity date<input id="activity-date" type="date" className="form-input" defaultValue="2026-08-26" required /></label><label className="form-label" htmlFor="activity-support">Support given<input id="activity-support" className="form-input" defaultValue={selectedProgram.name} required /></label><div className="program-recipient-list"><div className="program-recipient-heading"><strong>Recipients</strong><span>{checkedRecipients.length} selected</span></div>{selectedProgram.recipients.map((recipient) => <label key={recipient} className="program-recipient"><input type="checkbox" checked={checkedRecipients.includes(recipient)} onChange={() => toggleRecipient(recipient)} /><span>{recipient}</span><small>{checkedRecipients.includes(recipient) ? 'Received' : 'Not yet recorded'}</small></label>)}</div><label className="form-label" htmlFor="activity-status">Activity status<select id="activity-status" className="form-select" value={activityStatus} onChange={(event) => setActivityStatus(event.target.value)}><option>Open</option><option>Completed</option></select></label><label className="form-label" htmlFor="activity-remarks">Remarks<textarea id="activity-remarks" className="form-input" rows="2" /></label></div><div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setShowActivityModal(false)}>Cancel</button><button type="submit" className="btn-primary">Save activity</button></div></form></div>}
    </div>
  );
}
