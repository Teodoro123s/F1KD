import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MotherFormFields } from './BeneficiaryMother';
import { useMothers } from '../../../context/MothersContext';
import { apiGetMother, apiUpdateMother, apiUploadMotherDocuments } from '../../../api/mothers';
import { formatDateForInput } from '../../../utils/dateFormat';
import { capitalizeNameValue } from '../../../utils/nameFormat';
import { getSummary } from '../../Community/communityService';
import PageHeader from '../../../components/ui/PageHeader';
import { notifyAction } from '../../../components/ActionFeedback';
import { CONTACT_NUMBER_POLICY, isValidContactNumber } from '../../../utils/contactNumber';
import { formatPhilHealthNumber, getPhilHealthNumberError } from '../../../utils/philHealthNumber';
import { getMaternalBirthCountErrors, hasMiscarriageHighRiskCount } from '../../../utils/maternalBirthCounts';

const parseAddressParts = (address = '') => {
  const parts = String(address || '').split(',').map((part) => part.trim()).filter(Boolean);
  return {
    province: parts[0] || '',
    city: parts[1] || '',
    barangay: parts[2] || '',
  };
};

const normalizeMotherDates = (mother) => {
  const dateFields = [
    'dob', 'lmpDate', 'eddDate', 'prenatalRegDate', 'dentalCheckupDate',
    'influenzaDate', 'hepatitisADate', 'hepatitisBDate', 'covid19Date',
    'influenzaDose2Date', 'influenzaDose3Date',
    'hepatitisADose2Date', 'hepatitisADose3Date',
    'hepatitisBDose2Date', 'hepatitisBDose3Date',
    'covid19Dose2Date', 'covid19Dose3Date',
  ];
  const vaccineFields = ['tt1Date', 'tt2Date', 'tt3Date', 'tt4Date', 'tt5Date'];
  return [...dateFields, ...vaccineFields].reduce((result, field) => ({
    ...result,
    [field]: formatDateForInput(result[field]),
  }), { ...mother });
};

const normalizeMotherForm = (mother = {}) => {
  const normalized = normalizeMotherDates(mother);
  const addressParts = parseAddressParts(normalized.address || '');
  const legacyVaccineRemarks = [1, 2, 3, 4, 5]
    .map((num) => normalized[`tt${num}Remarks`])
    .filter(Boolean)
    .join('; ');
  return {
    ...normalized,
    philhealthNumber: formatPhilHealthNumber(normalized.philhealthNumber || ''),
    ttRemarks: normalized.ttRemarks ?? legacyVaccineRemarks,
    firstName: capitalizeNameValue(normalized.firstName || ''),
    middleName: capitalizeNameValue(normalized.middleName || ''),
    lastName: capitalizeNameValue(normalized.lastName || ''),
    maidenSurname: capitalizeNameValue(normalized.maidenSurname || ''),
    suffix: capitalizeNameValue(normalized.suffix || ''),
    emergencyName: capitalizeNameValue(normalized.emergencyName || ''),
    spouseFirstName: capitalizeNameValue(normalized.spouseFirstName || ''),
    spouseSurname: capitalizeNameValue(normalized.spouseSurname || ''),
    province: normalized.province || addressParts.province,
    city: normalized.city || addressParts.city,
    barangay: normalized.barangay || addressParts.barangay,
  };
};

export default function EditMotherPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const initialMother = location.state?.mother || null;

  const { mothers, setMothers } = useMothers();
  const formRef = useRef(null);

  const [form, setForm] = useState(() => (initialMother ? normalizeMotherForm(initialMother) : {}));
  const [documentFiles, setDocumentFiles] = useState({ birthCertificate: null, consent: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [communityOptions, setCommunityOptions] = useState({ communities: [], groups: [], batches: [] });
  const [activeTab, setActiveTab] = useState('general');
  const maternalBirthCountErrors = getMaternalBirthCountErrors(form);

  const profileSteps = [
    ['general', 'General'],
    ['prenatal', 'Prenatal/OB'],
    ['medical_dental', 'Medical & Dental'],
    ['vaccine', 'Vaccine'],
  ];

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
    if (initialMother) setForm(normalizeMotherForm(initialMother));
  }, [initialMother]);

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    apiGetMother(id)
      .then((response) => {
        if (active && response?.mother) setForm(normalizeMotherForm(response.mother));
      })
      .catch((loadError) => {
        if (active && !initialMother) {
          notifyAction(loadError.message || 'Unable to load mother', 'error');
          setError(loadError.message || 'Unable to load mother');
        }
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
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary back-action">Back</button>
      </div>
    );
  }

  const fullName = `${form.firstName || ''} ${form.middleName || ''} ${form.lastName || ''} ${form.suffix || ''}`
    .replace(/\s+/g, ' ')
    .trim() || 'Mother Profile';

  const handleSaveRequest = (e) => {
    e.preventDefault();
    if (Object.keys(maternalBirthCountErrors).length > 0) {
      setActiveTab('prenatal');
      notifyAction(Object.values(maternalBirthCountErrors)[0], 'error');
      return;
    }
    const philHealthNumberError = getPhilHealthNumberError(
      form.philhealthNumber,
      Boolean(form.philhealthMember),
    );
    if (philHealthNumberError) {
      setActiveTab('general');
      notifyAction(philHealthNumberError, 'error');
      return;
    }
    const invalidContact = [
      { field: 'contactNumber', label: 'Contact number', tab: 'general' },
      { field: 'emergencyContact', label: 'Emergency contact number', tab: 'general' },
      { field: 'dentistContact', label: 'Dentist contact number', tab: 'medical_dental' },
    ].find(({ field }) => String(form[field] ?? '').trim() && !isValidContactNumber(form[field]));
    if (invalidContact) {
      setActiveTab(invalidContact.tab);
      notifyAction(`${invalidContact.label}: ${CONTACT_NUMBER_POLICY}`, 'error');
      return;
    }
    setShowSaveConfirm(true);
  };

  const handleSave = async () => {
    setShowSaveConfirm(false);
    setSaving(true);
    setError(null);
    try {
      const motherId = id || form.id || form.motherId;
      const updatedForm = {
        ...form,
        isHighRisk: hasMiscarriageHighRiskCount(form) ? 'Yes' : form.isHighRisk,
      };
      const res = await apiUpdateMother(motherId, updatedForm);
      let updated = res && res.mother ? res.mother : (res || form);
      if (documentFiles.birthCertificate || documentFiles.consent) {
        const documentResponse = await apiUploadMotherDocuments(motherId, documentFiles);
        if (documentResponse?.mother) updated = { ...updated, ...documentResponse.mother };
      }

      // Update context: replace matching mother by id or motherId
      setMothers((prev) => prev.map((m) => {
        const midA = String(m.id || m.motherId || m.mother_id || '');
        const midB = String(updated.id || updated.motherId || updated.mother_id || '');
        if (midA && midA === midB) return { ...m, ...updated };
        return m;
      }));

      notifyAction('Mother profile updated successfully.', 'success');

      // navigate back to the detail view and pass updated mother
      navigate(-1, { state: { updatedMother: updated } });
    } catch (err) {
      console.error('Failed to update mother', err);
      const message = err.message || 'Failed to save changes';
      setError(message);
      notifyAction(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="community-page beneficiary-page edit-mother-page">
      <PageHeader
        title={fullName}
        breadcrumbs={[{ label: 'Beneficiaries', href: '/beneficiary' }, { label: 'Mother Profile' }, { label: 'Edit' }]}
        actions={(
          <>
            <button type="button" className="btn-secondary edit-mother-action" onClick={() => navigate(-1)}>Cancel</button>
            <button type="button" className="btn-primary edit-mother-action" disabled={saving} onClick={() => formRef.current?.requestSubmit()}>{saving ? 'Saving...' : 'Save'}</button>
          </>
        )}
      />

      {showSaveConfirm && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setShowSaveConfirm(false);
        }}>
          <div className="modal-content signout-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="save-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header-section">
              <h3 id="save-confirm-title">Save changes?</h3>
              <button type="button" className="btn-close-modal" onClick={() => setShowSaveConfirm(false)} aria-label="Close save confirmation" disabled={saving}>✕</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to save the updated mother profile?</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowSaveConfirm(false)} disabled={saving}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      <form ref={formRef} id="mother-edit-form" onSubmit={handleSaveRequest} className="mother-edit-form">
        <div className="mother-detail-profile-content edit-mother-profile-content">
          <div className="stepper-progress mother-detail-stepper">
            <div className="stepper-steps" role="tablist" aria-label="Mother profile sections">
              {profileSteps.map(([tab, label], index) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={`stepper-step ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  <span className="stepper-step-index">{index + 1}</span>
                  <span className="stepper-step-label">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="create-form-body mother-detail-shared-form">
            <div className="modal-body-scrollable">
              <MotherFormFields
                activeTab={activeTab}
                form={form}
                setForm={setForm}
                communities={communityOptions.communities}
                groups={communityOptions.groups}
                batches={communityOptions.batches}
                documentFiles={documentFiles}
                setDocumentFiles={setDocumentFiles}
                autoCalculate={false}
                readOnly={false}
                validationErrors={maternalBirthCountErrors}
              />
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
