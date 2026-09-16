import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MotherFormFields } from './BeneficiaryMother';
import { useMothers } from '../../../context/MothersContext';
import { apiGetMother, apiUpdateMother } from '../../../api/mothers';
import { formatDateForInput } from '../../../utils/dateFormat';
import { getSummary } from '../../Community/communityService';
import PageHeader from '../../../components/ui/PageHeader';

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
  const [activeTab, setActiveTab] = useState('general');
  const EDIT_STEPS = ['general', 'prenatal', 'medical_dental', 'vaccine'];

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

  const handleNextStep = (event) => {
    event.preventDefault();
    const currentIndex = EDIT_STEPS.indexOf(activeTab);
    if (currentIndex < EDIT_STEPS.length - 1) {
      setActiveTab(EDIT_STEPS[currentIndex + 1]);
    }
  };

  const handleBackStep = (event) => {
    event.preventDefault();
    const currentIndex = EDIT_STEPS.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(EDIT_STEPS[currentIndex - 1]);
    }
  };

  return (
    <section className="community-page beneficiary-page edit-mother-page">
      <PageHeader
        title="Beneficiaries"
        breadcrumbs={[{ label: 'Beneficiaries', to: '/beneficiary' }, { label: 'Edit' }]}
      />

      {error && <div className="form-error" style={{ color: 'var(--danger-color)', margin: '8px 0' }}>{error}</div>}

      <div className="stepper-progress">
        <div className="stepper-steps" role="tablist">
          {EDIT_STEPS.map((step, index) => {
            const label = step === 'general' ? 'General' : step === 'prenatal' ? 'Prenatal/OB' : step === 'medical_dental' ? 'Medical & Dental' : 'Vaccine';
            return (
              <button
                key={step}
                type="button"
                role="tab"
                aria-selected={activeTab === step}
                className={`stepper-step ${activeTab === step ? 'active' : ''}`}
                onClick={() => setActiveTab(step)}
              >
                <span className="stepper-step-index">{index + 1}</span>
                <span className="stepper-step-label">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="create-form-body">
        <form id="mother-edit-form" onSubmit={handleSave}>
          <div className="modal-body-scrollable">
            <MotherFormFields
              activeTab={activeTab}
              form={form}
              setForm={setForm}
              communities={communityOptions.communities}
              groups={communityOptions.groups}
              batches={communityOptions.batches}
              autoCalculate={false}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={() => navigate(-1)} disabled={saving}>Cancel</button>
            {activeTab !== 'general' && (
              <button type="button" className="btn-secondary btn-back" onClick={handleBackStep} disabled={saving}>Back</button>
            )}
            {activeTab !== 'vaccine' ? (
              <button type="button" className="btn-primary btn-next" onClick={handleNextStep} disabled={saving}>Next</button>
            ) : (
              <button type="submit" className="btn-create-action" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
