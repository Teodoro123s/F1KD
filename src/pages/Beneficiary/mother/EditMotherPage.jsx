import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { MotherFormFields } from './BeneficiaryMother';
import { useMothers } from '../../../context/MothersContext';
import { apiGetMother, apiUpdateMother, apiUploadMotherDocuments } from '../../../api/mothers';
import { formatDateForInput } from '../../../utils/dateFormat';
import { capitalizeNameValue } from '../../../utils/nameFormat';
import { normalizeFirstName } from '../../../utils/firstNameValidation';
import { getMotherIdentityErrors } from '../../../utils/motherIdentity';
import { getSummary } from '../../Community/communityService';
import useModalAccessibility from '../../../components/ui/useModalAccessibility';
import { notifyAction } from '../../../components/ActionFeedback';
import { CONTACT_NUMBER_POLICY, isValidContactNumber } from '../../../utils/contactNumber';
import { formatPhilHealthNumber, getPhilHealthNumberError } from '../../../utils/philHealthNumber';
import { getMaternalBirthCountErrors, hasMiscarriageHighRiskCount } from '../../../utils/maternalBirthCounts';
import { navigateBack } from '../../../utils/navigation';
import { useStepNavigation } from '../../../utils/useStepNavigation';
import { StepNavigationStatus } from '../../../components/ui/StepNavigationButton';
import { formatFirstAndSurname, splitFirstAndSurname } from '../../../utils/personName.mjs';

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
  const spouseName = splitFirstAndSurname(normalized.spouseName || '');
  const emergencyName = splitFirstAndSurname(normalized.emergencyName || '');
  const legacyVaccineRemarks = [1, 2, 3, 4, 5]
    .map((num) => normalized[`tt${num}Remarks`])
    .filter(Boolean)
    .join('; ');
  return {
    ...normalized,
    philhealthNumber: formatPhilHealthNumber(normalized.philhealthNumber || ''),
    ttRemarks: normalized.ttRemarks ?? legacyVaccineRemarks,
    firstName: normalizeFirstName(normalized.firstName || ''),
    middleName: capitalizeNameValue(normalized.middleName || ''),
    lastName: capitalizeNameValue(normalized.lastName || ''),
    maidenSurname: capitalizeNameValue(normalized.maidenSurname || ''),
    suffix: capitalizeNameValue(normalized.suffix || ''),
    emergencyFirstName: capitalizeNameValue(normalized.emergencyFirstName || emergencyName.firstName),
    emergencySurname: capitalizeNameValue(normalized.emergencySurname || emergencyName.surname),
    spouseFirstName: capitalizeNameValue(normalized.spouseFirstName || spouseName.firstName),
    spouseSurname: capitalizeNameValue(normalized.spouseSurname || spouseName.surname),
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
  const [loadError, setLoadError] = useState(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [communityOptions, setCommunityOptions] = useState({ communities: [], groups: [], batches: [] });
  const [activeTab, setActiveTab] = useState('general');
  const { navigationDirection, navigationError, isNavigating, runStepNavigation } = useStepNavigation();
  const maternalBirthCountErrors = getMaternalBirthCountErrors(form);
  const motherIdentityErrors = getMotherIdentityErrors(form);
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);

  const profileSteps = [
    ['general', 'General'],
    ['prenatal', 'Prenatal/OB'],
    ['medical_dental', 'Medical & Dental'],
    ['vaccine', 'Vaccine'],
  ];
  const closeEditDrawer = () => {
    if (showSaveConfirm) return;
    navigateBack(navigate, location, `/beneficiary/mother/${id}`);
  };

  useModalAccessibility({
    open: true,
    onClose: closeEditDrawer,
    dialogRef: drawerRef,
    initialFocusRef: closeButtonRef,
    closeDisabled: saving,
  });

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
          setLoadError(loadError.message || 'Unable to load mother');
        }
      });
    return () => { active = false; };
  }, [id, initialMother]);

  const fullName = `${form.firstName || ''} ${form.middleName || ''} ${form.lastName || ''} ${form.suffix || ''}`
    .replace(/\s+/g, ' ')
    .trim() || 'Mother Profile';

  const handleSaveRequest = (e) => {
    e.preventDefault();
    const firstNameError = motherIdentityErrors.firstName;
    if (firstNameError) {
      setActiveTab('general');
      notifyAction(firstNameError, 'error');
      document.getElementById('mother-first-name')?.focus();
      return;
    }
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

  const handleProfileStepChange = (nextTab) => {
    const currentIndex = profileSteps.findIndex(([tab]) => tab === activeTab);
    const nextIndex = profileSteps.findIndex(([tab]) => tab === nextTab);
    return runStepNavigation(() => {
      if (nextIndex > currentIndex) {
        if (activeTab === 'prenatal' && Object.keys(maternalBirthCountErrors).length) {
          notifyAction(Object.values(maternalBirthCountErrors)[0], 'error');
          return false;
        }
        if (activeTab === 'general') {
          const philHealthError = getPhilHealthNumberError(form.philhealthNumber, Boolean(form.philhealthMember));
          if (philHealthError) {
            notifyAction(philHealthError, 'error');
            return false;
          }
          const invalidContact = [
            { field: 'contactNumber', label: 'Contact number' },
            { field: 'emergencyContact', label: 'Emergency contact number' },
          ].find(({ field }) => String(form[field] ?? '').trim() && !isValidContactNumber(form[field]));
          if (invalidContact) {
            notifyAction(`${invalidContact.label}: ${CONTACT_NUMBER_POLICY}`, 'error');
            return false;
          }
        }
        if (activeTab === 'medical_dental' && String(form.dentistContact ?? '').trim() && !isValidContactNumber(form.dentistContact)) {
          notifyAction(`Dentist contact number: ${CONTACT_NUMBER_POLICY}`, 'error');
          return false;
        }
      }
      setActiveTab(nextTab);
      return true;
    }, nextIndex >= currentIndex ? 'next' : 'previous');
  };

  const handleProfileTabKeyDown = (event, currentIndex) => {
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % profileSteps.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + profileSteps.length) % profileSteps.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = profileSteps.length - 1;
    if (nextIndex === currentIndex) return;

    event.preventDefault();
    const [nextTab] = profileSteps[nextIndex];
    handleProfileStepChange(nextTab).then((changed) => {
      if (changed) document.getElementById(`mother-edit-tab-${nextTab}`)?.focus();
    });
  };

  const handleSave = async () => {
    setShowSaveConfirm(false);
    setSaving(true);
    setError(null);
    try {
      const motherId = id || form.id || form.motherId;
      const updatedForm = {
        ...form,
        firstName: normalizeFirstName(form.firstName),
        emergencyName: formatFirstAndSurname(form.emergencyFirstName, form.emergencySurname),
        spouseName: formatFirstAndSurname(form.spouseFirstName, form.spouseSurname),
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
      navigateBack(navigate, location, `/beneficiary/mother/${motherId}`, {
        mother: updated,
        updatedMother: updated,
      });
    } catch (err) {
      console.error('Failed to update mother', err);
      const message = err.message || 'Failed to save changes';
      setError(message);
      notifyAction(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const isLoading = !initialMother && !form.id && !form.motherId && !loadError;

  return createPortal((
    <div
      className="edit-mother-drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeEditDrawer();
      }}
    >
      <aside
        ref={drawerRef}
        className="edit-mother-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-mother-drawer-title"
        tabIndex={-1}
      >
        <header className="edit-mother-drawer__header">
          <h2 id="edit-mother-drawer-title">{fullName}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="edit-mother-drawer__close"
            onClick={closeEditDrawer}
            disabled={saving}
            aria-label="Close edit mother profile"
          >
            ×
          </button>
        </header>

        {isLoading ? (
          <div className="edit-mother-drawer__message" role="status">Loading mother data...</div>
        ) : loadError && !initialMother ? (
          <div className="edit-mother-drawer__message" role="alert">
            <p>Unable to load mother data for editing. Try opening the mother profile and clicking Edit.</p>
            <button type="button" className="btn-secondary" onClick={closeEditDrawer}>Back to profile</button>
          </div>
        ) : (
          <form ref={formRef} id="mother-edit-form" onSubmit={handleSaveRequest} className="mother-edit-form edit-mother-drawer__form">
            <div className="stepper-progress mother-detail-stepper edit-mother-drawer__tabs">
              <div className="stepper-steps" role="tablist" aria-label="Mother profile sections">
                {profileSteps.map(([tab, label], index) => (
                  <button
                    key={tab}
                    id={`mother-edit-tab-${tab}`}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    aria-controls="mother-edit-tabpanel"
                    tabIndex={activeTab === tab ? 0 : -1}
                    className={`stepper-step ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => handleProfileStepChange(tab)}
                    onKeyDown={(event) => handleProfileTabKeyDown(event, index)}
                    disabled={isNavigating || saving}
                  >
                    <span className="stepper-step-index">{index + 1}</span>
                    <span className="stepper-step-label">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div
              id="mother-edit-tabpanel"
              className="edit-mother-drawer__scroll"
              role="tabpanel"
              aria-labelledby={`mother-edit-tab-${activeTab}`}
              tabIndex={0}
            >
              <StepNavigationStatus direction={navigationDirection} error={navigationError} />
              {error && <p className="edit-mother-drawer__error" role="alert">{error}</p>}
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
                    existingDocumentNames={{
                      birthCertificate: form.birthCertificateDocumentName,
                      consent: form.consentDocumentName,
                    }}
                    autoCalculate={false}
                    readOnly={false}
                    validationErrors={{
                      ...maternalBirthCountErrors,
                      ...(motherIdentityErrors.firstName ? { firstName: motherIdentityErrors.firstName } : {}),
                    }}
                  />
                </div>
              </div>
            </div>

            <footer className="edit-mother-drawer__actions">
              <button type="button" className="btn-secondary" onClick={closeEditDrawer} disabled={saving}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving || isNavigating}>{saving ? 'Saving...' : 'Save'}</button>
            </footer>

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
          </form>
        )}
      </aside>
    </div>
  ), document.body);
}
