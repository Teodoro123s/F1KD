import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MotherFormFields } from './BeneficiaryMother';
import { useMothers } from '../../../context/MothersContext';
import { apiGetMother, apiUpdateMother } from '../../../api/mothers';
import { formatDateForInput } from '../../../utils/dateFormat';
import { getSummary } from '../../Community/communityService';

const normalizeMotherDates = (mother) => {
  const dateFields = ['dob', 'lmpDate', 'eddDate', 'prenatalRegDate', 'dentalCheckupDate'];
  const vaccineFields = ['tt1Date', 'tt2Date', 'tt3Date', 'tt4Date', 'tt5Date'];
  return [...dateFields, ...vaccineFields].reduce((result, field) => ({
    ...result,
    [field]: formatDateForInput(result[field]),
  }), { ...mother });
};

export default function EditMotherPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const initialMother = location.state?.mother || null;

  const { mothers, setMothers } = useMothers();

  const [form, setForm] = useState(() => (initialMother ? normalizeMotherDates(initialMother) : {}));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [communityOptions, setCommunityOptions] = useState({ communities: [], groups: [], batches: [] });

  useEffect(() => {
    getSummary()
      .then((summary) => setCommunityOptions({
        communities: summary.communities || [],
        groups: summary.groups || [],
        batches: summary.batches || [],
      }))
      .catch((summaryError) => console.error('[EditMotherPage] Unable to load community options:', summaryError));
  }, []);

  useEffect(() => {
    if (initialMother) setForm(normalizeMotherDates(initialMother));
  }, [initialMother]);

  useEffect(() => {
    if (initialMother || !id) return undefined;
    let active = true;
    apiGetMother(id)
      .then((response) => {
        if (active && response?.mother) setForm(normalizeMotherDates(response.mother));
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Unable to load mother');
      });
    return () => { active = false; };
  }, [id, initialMother]);

  if (!initialMother && !form.id && !form.motherId && !error) {
    return <div className="edit-mother-page"><p>Loading mother data...</p></div>;
  }

  if (!initialMother && error) {
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
      </header>

      {error && <div className="form-error" style={{ color: 'var(--danger-color)', margin: '8px 0' }}>{error}</div>}

      <form onSubmit={handleSave} className="mother-edit-form">
        {['general', 'prenatal', 'medical_dental', 'vaccine'].map((section) => (
          <MotherFormFields
            key={section}
            activeTab={section}
            form={form}
            setForm={setForm}
            communities={communityOptions.communities}
            groups={communityOptions.groups}
            batches={communityOptions.batches}
            autoCalculate={false}
            readOnly={false}
          />
        ))}
        <div className="modal-footer edit-mother-footer">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </section>
  );
}
