import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MotherFormFields } from './BeneficiaryMother';
import { useMothers } from '../../../context/MothersContext';
import { apiUpdateMother } from '../../../api/mothers';

export default function EditMotherPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const initialMother = location.state?.mother || null;

  const { mothers, setMothers } = useMothers();

  const [form, setForm] = useState(() => (initialMother ? { ...initialMother } : {}));
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialMother) setForm({ ...initialMother });
  }, [initialMother]);

  if (!initialMother) {
    return (
      <div className="edit-mother-page">
        <p>Unable to load mother data for editing. Try opening the mother profile and clicking Edit.</p>
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Back</button>
      </div>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const motherId = id || form.id || form.motherId;
      const res = await apiUpdateMother(motherId, form);
      const updated = res && res.mother ? res.mother : (res || form);

      // Update context: replace matching mother by id or motherId
      setMothers((prev) => prev.map((m) => {
        const midA = String(m.id || m.motherId || m.mother_id || '');
        const midB = String(updated.id || updated.motherId || updated.mother_id || '');
        if (midA && midA === midB) return { ...m, ...updated };
        return m;
      }));

      // navigate back to the detail view and pass updated mother
      navigate(-1, { state: { updatedMother: updated } });
    } catch (err) {
      console.error('Failed to update mother', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="edit-mother-page">
      <header className="edit-mother-header">
        <h1 className="edit-mother-title">Edit: {form.name || `${form.firstName || ''} ${form.lastName || ''}`}</h1>
        <div className="edit-mother-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </header>

      {error && <div className="form-error" style={{ color: 'var(--danger-color)', margin: '8px 0' }}>{error}</div>}

      <form onSubmit={handleSave} className="mother-edit-form">
        <div className="form-tabs">
          <button type="button" className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>General</button>
          <button type="button" className={`tab-btn ${activeTab === 'prenatal' ? 'active' : ''}`} onClick={() => setActiveTab('prenatal')}>Prenatal</button>
          <button type="button" className={`tab-btn ${activeTab === 'medical_dental' ? 'active' : ''}`} onClick={() => setActiveTab('medical_dental')}>Medical</button>
          <button type="button" className={`tab-btn ${activeTab === 'vaccine' ? 'active' : ''}`} onClick={() => setActiveTab('vaccine')}>Vaccine</button>
        </div>

        <MotherFormFields activeTab={activeTab} form={form} setForm={setForm} readOnly={false} />
      </form>
    </section>
  );
}
