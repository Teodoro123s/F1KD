import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChildFormFields } from './BeneficiaryChild';
import { useMothers } from '../../../context/MothersContext';
import { capitalizeNameValue } from '../../../utils/nameFormat';
import { notifyAction } from '../../../components/ActionFeedback';
import { apiCreateChild, apiUploadChildBirthDocument } from '../../../api/children';
import { CHILD_VACCINE_SEQUENCES, getChildRecordErrors } from '../../../utils/childRecordValidation';
import { joinChildBirthPlace, splitChildBirthPlace } from '../../../utils/childBirthPlace';
import { navigateBack } from '../../../utils/navigation';

const CHILD_DRAFT_KEY = 'f1kd.create-child.draft';
const CREATE_STEPS = ['general', 'prenatal', 'medical_dental', 'vaccine'];
const STEP_LABELS = ['General information', 'Birth / Newborn', 'Medical', 'Immunizations'];

const getErrorsForStep = (step, form, childErrors, motherSelected) => {
  if (step === 'general') {
    const errors = {};
    if (!motherSelected) errors.motherId = 'Select a mother before creating the child.';
    if (!String(form.firstName ?? '').trim()) errors.firstName = 'First name is required.';
    if (!String(form.lastName ?? '').trim()) errors.lastName = 'Last name is required.';
    ['firstName', 'middleName', 'lastName'].forEach((field) => {
      if (childErrors[field]) errors[field] = childErrors[field];
    });
    return errors;
  }
  if (step === 'prenatal') {
    return Object.fromEntries(
      Object.entries(childErrors).filter(([field]) => [
        'birthDate',
        'birthWeight',
        'birthLength',
        'headCircumference',
        'chestCircumference',
        'noOfChildDelivered',
        'apgarScore',
      ].includes(field)),
    );
  }
  if (step === 'vaccine') {
    return Object.fromEntries(
      Object.entries(childErrors).filter(([field]) => CHILD_VACCINE_SEQUENCES.flat().includes(field)),
    );
  }
  return {};
};

const loadChildDraft = (fallback) => {
  try {
    const savedDraft = JSON.parse(localStorage.getItem(CHILD_DRAFT_KEY) || 'null');
    if (!savedDraft?.form) return fallback;

    const form = { ...savedDraft.form };
    if (!form.birthPlaceCity && !form.birthPlaceProvince && form.birthPlace) {
      Object.assign(form, splitChildBirthPlace(form.birthPlace));
      delete form.birthPlace;
    }
    return { ...fallback, ...form };
  } catch (error) {
    return fallback;
  }
};

const emptyGroupForm = () => ({
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  birthDate: '',
  birthWeight: '',
  birthLength: '',
  headCircumference: '',
  chestCircumference: '',
  gender: 'Male',
  bloodType: '',
  exclusiveBreastfeeding: '',
  noOfChildDelivered: '',
  multipleBirthType: '',
  expandedNewbornScreening: '',
  expandedNewbornScreeningResult: '',
  deliveryType: 'Vaginal',
  assignedBatchIds: [],
  leader: '',
  members: 1,
  status: 'Active',
  birthPlaceCity: '',
  birthPlaceProvince: '',
  birthAttendant: '',
  apgarScore: '',
  nutritionNotes: '',
  medicalConditions: {
    congenitalHeartDisease: false,
    respiratoryIssues: false,
    prematurity: false,
    jaundice: false,
    anemia: false,
    growthDelay: false,
  },
  medicalRemarks: '',
  bcgDose1: '',
  bcgDose2: '',
  bcgDose3: '',
  bcgRemarks: '',
  hepbDose1: '',
  hepbDose2: '',
  hepbDose3: '',
  hepbRemarks: '',
  ipvDose1: '',
  ipvDose2: '',
  ipvDose3: '',
  ipvRemarks: '',
  opvDose1: '',
  opvDose2: '',
  opvDose3: '',
  opvRemarks: '',
  pcvDose1: '',
  pcvDose2: '',
  pcvDose3: '',
  pcvRemarks: '',
  dptDose1: '',
  dptDose2: '',
  dptDose3: '',
  dptRemarks: '',
  mmrDose1: '',
  mmrDose2: '',
  mmrDose3: '',
  mmrRemarks: '',
  batch: '',
});

export default function CreateChildPage({
  communities,
  batches,
  mothers: availableMothers = [],
  setGroups,
  navigate,
}) {
  const location = useLocation();
  const motherFromState = location.state?.mother || null;
  const { mothers, setMothers } = useMothers();
  const [groupForm, setGroupForm] = useState(() => loadChildDraft(emptyGroupForm()));
  const [birthDocumentFile, setBirthDocumentFile] = useState(null);
  const [pendingChild, setPendingChild] = useState(null);
  const [creating, setCreating] = useState(false);
  const [showRequiredValidation, setShowRequiredValidation] = useState(false);
  const [selectedMotherId, setSelectedMotherId] = useState(() => {
    try { return motherFromState?.id || motherFromState?.motherId || JSON.parse(localStorage.getItem(CHILD_DRAFT_KEY) || 'null')?.selectedMotherId || ''; } catch (error) { return motherFromState?.id || motherFromState?.motherId || ''; }
  });
  const [createActiveTab, setCreateActiveTab] = useState('general');
  const createActiveIndex = CREATE_STEPS.indexOf(createActiveTab) >= 0 ? CREATE_STEPS.indexOf(createActiveTab) : 0;
  const selectedMother = motherFromState || availableMothers.find((mother) => (
    String(mother.id || mother.motherId || '') === String(selectedMotherId)
  ));
  const selectedMotherIdValue = selectedMother?.id || selectedMother?.motherId || selectedMotherId;
  const childRecordErrors = getChildRecordErrors(groupForm);
  const childErrorsByStep = (step) => getErrorsForStep(step, groupForm, childRecordErrors, Boolean(selectedMotherIdValue));

  useEffect(() => {
    if (!selectedMother) return;

    setGroupForm((prev) => ({
      ...prev,
      community: selectedMother.community || selectedMother.raw?.community_name || selectedMother.raw?.community || prev.community || '',
      batch: selectedMother.batch || selectedMother.raw?.batch_name || selectedMother.raw?.batch || prev.batch || '',
      motherId: selectedMother.id || selectedMother.motherId || prev.motherId || null,
    }));
  }, [selectedMother]);

  useEffect(() => {
    try {
      localStorage.setItem(CHILD_DRAFT_KEY, JSON.stringify({ form: groupForm, selectedMotherId }));
    } catch (error) {
      console.warn('[CreateChildPage] Unable to save form draft:', error);
    }
  }, [groupForm, selectedMotherId]);

  useEffect(() => {
    if (!showRequiredValidation || createActiveTab !== 'general') return;
    const invalidField = document.querySelector('[aria-invalid="true"]');
    if (!invalidField) return;
    invalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    invalidField.focus({ preventScroll: true });
  }, [createActiveTab, selectedMotherId, showRequiredValidation]);

  // If navigated from a mother, prefill mother-related fields and show mother info
  useEffect(() => {
    if (motherFromState) {
      const motherIdentifier = motherFromState.id || motherFromState.motherId || '';
      setSelectedMotherId(motherIdentifier);
      setGroupForm((prev) => ({
        ...prev,
        motherId: motherIdentifier || prev.motherId || null,
        community: prev.community || motherFromState.community || motherFromState.area || prev.community || '',
      }));
    }
  }, [motherFromState]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (createActiveTab !== 'vaccine') {
      const currentIndex = CREATE_STEPS.indexOf(createActiveTab);
      const errors = childErrorsByStep(createActiveTab);
      if (Object.keys(errors).length > 0) {
        setShowRequiredValidation(true);
        notifyAction(Object.values(errors)[0], 'error');
        return;
      }
      setCreateActiveTab(CREATE_STEPS[Math.min(currentIndex + 1, CREATE_STEPS.length - 1)]);
      return;
    }
    const invalidStep = CREATE_STEPS.find((step) => Object.keys(childErrorsByStep(step)).length > 0);
    if (invalidStep) {
      const message = Object.values(childErrorsByStep(invalidStep))[0];
      setShowRequiredValidation(true);
      setCreateActiveTab(invalidStep);
      notifyAction(message, 'error');
      return;
    }

    const normalizedFirstName = capitalizeNameValue(groupForm.firstName.trim());
    const normalizedMiddleName = capitalizeNameValue(groupForm.middleName.trim());
    const normalizedLastName = capitalizeNameValue(groupForm.lastName.trim());
    const normalizedSuffix = capitalizeNameValue(groupForm.suffix.trim());
    const fullName = `${normalizedFirstName} ${normalizedMiddleName} ${normalizedLastName} ${normalizedSuffix}`
      .replace(/\s+/g, ' ')
      .trim();

    const payload = {
      motherId: selectedMother?.id || selectedMother?.motherId || null,
      communityId: selectedMother?.raw?.community_id || selectedMother?.communityId || null,
      groupId: selectedMother?.raw?.group_id || selectedMother?.groupId || null,
      batchId: selectedMother?.raw?.batch_id || selectedMother?.batchId || null,
      firstName: normalizedFirstName,
      middleName: normalizedMiddleName,
      lastName: normalizedLastName,
      suffix: normalizedSuffix,
      birthDate: groupForm.birthDate || null,
      birthWeight: groupForm.birthWeight || null,
      birthLength: groupForm.birthLength || null,
      headCircumference: groupForm.headCircumference || null,
      chestCircumference: groupForm.chestCircumference || null,
      gender: groupForm.gender || null,
      bloodType: groupForm.bloodType || null,
      noOfChildDelivered: groupForm.noOfChildDelivered || null,
      multipleBirthType: groupForm.multipleBirthType || null,
      expandedNewbornScreening: groupForm.expandedNewbornScreening || null,
      expandedNewbornScreeningResult: groupForm.expandedNewbornScreeningResult || null,
      deliveryType: groupForm.deliveryType || null,
      community: selectedMother?.community || selectedMother?.raw?.community_name || selectedMother?.raw?.community || null,
      batch: selectedMother?.batch || selectedMother?.raw?.batch_name || selectedMother?.raw?.batch || null,
      birthPlace: joinChildBirthPlace(groupForm.birthPlaceCity, groupForm.birthPlaceProvince) || null,
      birthAttendant: groupForm.birthAttendant || null,
      apgarScore: groupForm.apgarScore || null,
      nutritionNotes: groupForm.nutritionNotes || null,
      medicalConditions: groupForm.medicalConditions || {},
      bcgDate: groupForm.bcgDose1 || null,
      bcgDose1: groupForm.bcgDose1 || null,
      bcgDose2: groupForm.bcgDose2 || null,
      bcgDose3: groupForm.bcgDose3 || null,
      bcgRemarks: groupForm.bcgRemarks || null,
      hepbDate: groupForm.hepbDose1 || null,
      hepbDose1: groupForm.hepbDose1 || null,
      hepbDose2: groupForm.hepbDose2 || null,
      hepbDose3: groupForm.hepbDose3 || null,
      hepbRemarks: groupForm.hepbRemarks || null,
      ipvDate: groupForm.ipvDose1 || null,
      ipvDose1: groupForm.ipvDose1 || null,
      ipvDose2: groupForm.ipvDose2 || null,
      ipvDose3: groupForm.ipvDose3 || null,
      ipvRemarks: groupForm.ipvRemarks || null,
      opvDate: groupForm.opvDose1 || null,
      opvDose1: groupForm.opvDose1 || null,
      opvDose2: groupForm.opvDose2 || null,
      opvDose3: groupForm.opvDose3 || null,
      opvRemarks: groupForm.opvRemarks || null,
      pcvDate: groupForm.pcvDose1 || null,
      pcvDose1: groupForm.pcvDose1 || null,
      pcvDose2: groupForm.pcvDose2 || null,
      pcvDose3: groupForm.pcvDose3 || null,
      pcvRemarks: groupForm.pcvRemarks || null,
      dptDate: groupForm.dptDose1 || null,
      dptDose1: groupForm.dptDose1 || null,
      dptDose2: groupForm.dptDose2 || null,
      dptDose3: groupForm.dptDose3 || null,
      dptRemarks: groupForm.dptRemarks || null,
      mmrDate: groupForm.mmrDose1 || null,
      mmrDose1: groupForm.mmrDose1 || null,
      mmrDose2: groupForm.mmrDose2 || null,
      mmrDose3: groupForm.mmrDose3 || null,
      mmrRemarks: groupForm.mmrRemarks || null,
    };

    setPendingChild({ payload, fullName });
  };

  const confirmCreateChild = async () => {
    if (!pendingChild || creating) return;
    setCreating(true);

    try {
      const { child } = await apiCreateChild(pendingChild.payload);
      let savedChild = child;
      let documentUploadFailed = false;
      if (birthDocumentFile) {
        try {
          const documentResponse = await apiUploadChildBirthDocument(child.id || child.child_code, birthDocumentFile);
          savedChild = documentResponse?.child || child;
        } catch (documentError) {
          documentUploadFailed = true;
          console.error('Child created but birth document upload failed:', documentError);
        }
      }

      const newGroup = {
        id: child.id || `G-${Date.now()}`,
        name: pendingChild.fullName,
        firstName: child.first_name || child.firstName || groupForm.firstName.trim(),
        middleName: child.middle_name || child.middleName || groupForm.middleName.trim(),
        lastName: child.last_name || child.lastName || groupForm.lastName.trim(),
        suffix: child.suffix || groupForm.suffix.trim(),
        birthDate: child.birth_date || child.birthDate || groupForm.birthDate,
        birthWeight: child.birth_weight || child.birthWeight || groupForm.birthWeight,
        birthLength: child.birth_length || child.birthLength || groupForm.birthLength,
        headCircumference: child.head_circumference || child.headCircumference || groupForm.headCircumference,
        chestCircumference: child.chest_circumference || child.chestCircumference || groupForm.chestCircumference,
        gender: child.gender || groupForm.gender,
        bloodType: child.blood_type || child.bloodType || groupForm.bloodType,
        noOfChildDelivered: child.no_of_child_delivered || child.noOfChildDelivered || groupForm.noOfChildDelivered,
        multipleBirthType: child.multiple_birth_type || child.multipleBirthType || groupForm.multipleBirthType,
        expandedNewbornScreening: child.expanded_newborn_screening || child.expandedNewbornScreening || groupForm.expandedNewbornScreening,
        expandedNewbornScreeningResult: child.expanded_newborn_screening_result || child.expandedNewbornScreeningResult || groupForm.expandedNewbornScreeningResult,
        deliveryType: child.delivery_type || groupForm.deliveryType,
        healthStatus: child.health_status || groupForm.healthStatus,
        community: child.community_id || groupForm.community,
        batch: child.batch_id || groupForm.batch,
        assignedBatchIds: groupForm.assignedBatchIds || [],
        leader: groupForm.leader,
        members: groupForm.members,
        status: groupForm.status,
        ...splitChildBirthPlace(child.birth_place || joinChildBirthPlace(groupForm.birthPlaceCity, groupForm.birthPlaceProvince)),
        birthAttendant: child.birth_attendant || groupForm.birthAttendant,
        apgarScore: child.apgar_score || groupForm.apgarScore,
        nutritionNotes: child.nutrition_notes || groupForm.nutritionNotes,
        medicalConditions: groupForm.medicalConditions,
        medicalRemarks: groupForm.medicalRemarks,
        bcgDose1: child.BCG?.dose1 || child.bcgDose1 || groupForm.bcgDose1,
        bcgDose2: child.BCG?.dose2 || child.bcgDose2 || groupForm.bcgDose2,
        bcgDose3: child.BCG?.dose3 || child.bcgDose3 || groupForm.bcgDose3,
        bcgRemarks: child.BCG?.remarks || child.bcgRemarks || groupForm.bcgRemarks,
        hepbDose1: child.HepB?.dose1 || child.hepbDose1 || groupForm.hepbDose1,
        hepbDose2: child.HepB?.dose2 || child.hepbDose2 || groupForm.hepbDose2,
        hepbDose3: child.HepB?.dose3 || child.hepbDose3 || groupForm.hepbDose3,
        hepbRemarks: child.HepB?.remarks || child.hepbRemarks || groupForm.hepbRemarks,
        ipvDose1: child.IPV?.dose1 || child.ipvDose1 || groupForm.ipvDose1,
        ipvDose2: child.IPV?.dose2 || child.ipvDose2 || groupForm.ipvDose2,
        ipvDose3: child.IPV?.dose3 || child.ipvDose3 || groupForm.ipvDose3,
        ipvRemarks: child.IPV?.remarks || child.ipvRemarks || groupForm.ipvRemarks,
        opvDose1: child.OPV?.dose1 || child.opvDose1 || groupForm.opvDose1,
        opvDose2: child.OPV?.dose2 || child.opvDose2 || groupForm.opvDose2,
        opvDose3: child.OPV?.dose3 || child.opvDose3 || groupForm.opvDose3,
        opvRemarks: child.OPV?.remarks || child.opvRemarks || groupForm.opvRemarks,
        pcvDose1: child.PCV?.dose1 || child.pcvDose1 || groupForm.pcvDose1,
        pcvDose2: child.PCV?.dose2 || child.pcvDose2 || groupForm.pcvDose2,
        pcvDose3: child.PCV?.dose3 || child.pcvDose3 || groupForm.pcvDose3,
        pcvRemarks: child.PCV?.remarks || child.pcvRemarks || groupForm.pcvRemarks,
        dptDose1: child.DPT?.dose1 || child.dptDose1 || groupForm.dptDose1,
        dptDose2: child.DPT?.dose2 || child.dptDose2 || groupForm.dptDose2,
        dptDose3: child.DPT?.dose3 || child.dptDose3 || groupForm.dptDose3,
        dptRemarks: child.DPT?.remarks || child.dptRemarks || groupForm.dptRemarks,
        mmrDose1: child.MMR?.dose1 || child.mmrDose1 || groupForm.mmrDose1,
        mmrDose2: child.MMR?.dose2 || child.mmrDose2 || groupForm.mmrDose2,
        mmrDose3: child.MMR?.dose3 || child.mmrDose3 || groupForm.mmrDose3,
        mmrRemarks: child.MMR?.remarks || child.mmrRemarks || groupForm.mmrRemarks,
        birthDocumentName: savedChild.birth_document_name || savedChild.birthDocumentName || '',
        birthDocumentPath: savedChild.birth_document_path || savedChild.birthDocumentPath || '',
        address: child.address || groupForm.address || '',
        progress: child.progress || 0,
        childCheckups: null,
      };

      // add to groups list
      setGroups((prev) => [newGroup, ...prev]);
      notifyAction(documentUploadFailed
        ? 'Child created, but the birth document upload failed. You can upload it from Edit Child.'
        : 'Child created successfully.', documentUploadFailed ? 'error' : 'success');
      localStorage.removeItem(CHILD_DRAFT_KEY);
      setPendingChild(null);

      // if we were navigated here from a mother, append the child into that mother's children array
      if (motherFromState && typeof setMothers === 'function') {
        const updatedMother = { ...motherFromState, children: [newGroup, ...(motherFromState.children || [])] };
        setMothers((prev) => prev.map((m) => (
          (m.id === motherFromState.id || m.motherId === motherFromState.motherId) ? { ...m, children: [newGroup, ...(m.children || [])] } : m
        )));
        // navigate to the new child's detail page and include the updated mother in state so the child shows immediately
        navigate(`/beneficiary/child/${newGroup.id}`, {
          state: {
            mother: updatedMother,
            child: newGroup,
            mothers: undefined,
            returnTo: location.state?.returnTo || `/beneficiary/mother/${motherFromState.id || motherFromState.motherId}`,
          },
        });
        return;
      }

      navigate('/beneficiary');
    } catch (err) {
      console.error('Failed to create child', err);
      notifyAction(err?.message || 'Unable to create child. Please try again.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleNextStep = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const currentIndex = CREATE_STEPS.indexOf(createActiveTab);
    const errors = childErrorsByStep(createActiveTab);
    if (Object.keys(errors).length > 0) {
      setShowRequiredValidation(true);
      notifyAction(Object.values(errors)[0], 'error');
      return;
    }
    if (currentIndex < CREATE_STEPS.length - 1) {
      setCreateActiveTab(CREATE_STEPS[currentIndex + 1]);
    }
  };

  return (
    <section className="tabs-row create-view create-child-page">
      <header className="create-mother-page-header">
        <div>
          <span className="create-mother-eyebrow">Beneficiary registration</span>
          <h1 className="create-mother-page-title">Create Child Profile</h1>
          <p className="create-mother-page-subtitle">Enter the child's birth and health details, then record any available immunizations.</p>
        </div>
        <span className="create-mother-step-count">Step {createActiveIndex + 1} of {CREATE_STEPS.length}</span>
      </header>

      <section className="create-child-mother-panel" aria-label="Mother association">
        {!motherFromState ? (
          <div className="form-group">
            <label className="form-label" htmlFor="child-mother-select">Mother <span className="form-required-indicator" aria-hidden="true">*</span></label>
          <select
            id="child-mother-select"
            className={`form-select${showRequiredValidation && !selectedMotherId ? ' invalid' : ''}`}
            value={selectedMotherId}
            onChange={(event) => setSelectedMotherId(event.target.value)}
            required
            aria-invalid={showRequiredValidation && !selectedMotherId}
            aria-describedby={showRequiredValidation && !selectedMotherId ? 'child-mother-error' : undefined}
          >
            <option value="">Select mother</option>
            {availableMothers.map((mother) => (
              <option key={mother.id || mother.motherId} value={mother.id || mother.motherId}>
                {mother.name || `${mother.firstName || ''} ${mother.lastName || ''}`.trim()}
              </option>
            ))}
          </select>
          {showRequiredValidation && !selectedMotherIdValue && <small id="child-mother-error" className="field-validation-error" role="alert">Select a mother before creating the child.</small>}
          </div>
        ) : (
          <div className="create-child-selected-mother">
            <span className="form-label">Mother</span>
            <strong>{selectedMother?.name || `${selectedMother?.firstName || ''} ${selectedMother?.lastName || ''}`.trim() || 'Selected mother'}</strong>
            <span>{selectedMother?.community || selectedMother?.area || ''}</span>
          </div>
        )}
      </section>

      <nav className="stepper-progress create-mother-stepper" aria-label="Child profile sections">
        <div className="stepper-steps" role="tablist" aria-label="Form sections">
          {CREATE_STEPS.map((s, i) => {
            const label = STEP_LABELS[i];
            const isActive = createActiveTab === s;
            const isCompleted = i < createActiveIndex;
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="create-child-step-content"
                id={`create-child-step-${s}`}
                className={`stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => setCreateActiveTab(s)}
              >
                <span className="stepper-step-index">
                  {isCompleted ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="stepper-step-label">{label}</span>
              </button>
            );
          })}
        </div>
        <div className="create-mother-progress-track" aria-hidden="true">
          <span style={{ width: `${((createActiveIndex + 1) / CREATE_STEPS.length) * 100}%` }} />
        </div>
      </nav>

      <div className="create-form-body">
        <form className="create-mother-form" onSubmit={handleCreateGroup}>
          <div className="create-mother-form-note">
            <span className="create-mother-form-note-mark" aria-hidden="true">*</span>
            <p>Fields marked * are required. Measurements and immunization entries are optional when unavailable.</p>
          </div>
          <div
            className="create-mother-fields"
            id="create-child-step-content"
            role="tabpanel"
            aria-labelledby={`create-child-step-${createActiveTab}`}
          >
            <ChildFormFields
              activeTab={createActiveTab}
              form={groupForm}
              setForm={setGroupForm}
              communities={communities}
              batches={batches}
              birthDocumentFile={birthDocumentFile}
              setBirthDocumentFile={setBirthDocumentFile}
              showRequiredValidation={showRequiredValidation}
              validationErrors={childRecordErrors}
            />
          </div>
          <div className="create-mother-footer">
            <button type="button" className="btn-secondary create-mother-cancel" onClick={() => {
              localStorage.removeItem(CHILD_DRAFT_KEY);
              navigateBack(
                navigate,
                location,
                motherFromState
                  ? `/beneficiary/mother/${motherFromState.id || motherFromState.motherId}`
                  : '/beneficiary',
                motherFromState ? { mother: motherFromState } : undefined,
              );
            }}>Cancel</button>
            <div className="create-mother-footer-actions">
              {createActiveTab !== 'general' && (
              <button type="button" className="btn-secondary btn-back back-action" onClick={() => {
                if (createActiveTab === 'vaccine') setCreateActiveTab('medical_dental');
                else if (createActiveTab === 'medical_dental') setCreateActiveTab('prenatal');
                else setCreateActiveTab('general');
              }}>Back</button>
              )}
              {createActiveTab !== 'vaccine' ? (
                <button type="button" className="btn-primary btn-next" onClick={handleNextStep}>Continue</button>
              ) : (
                <button type="submit" className="btn-create-action">Create Child</button>
              )}
            </div>
          </div>
        </form>
      </div>
      {pendingChild && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !creating) setPendingChild(null);
        }}>
          <div className="modal-content signout-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="create-child-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header-section">
              <h3 id="create-child-confirm-title">Create child record?</h3>
              <button type="button" className="btn-close-modal" onClick={() => setPendingChild(null)} aria-label="Close confirmation" disabled={creating}>✕</button>
            </div>
            <div className="modal-body">
              <p>Create a child record for <strong>{pendingChild.fullName}</strong>?</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setPendingChild(null)} disabled={creating}>Cancel</button>
              <button type="button" className="btn-primary" onClick={confirmCreateChild} disabled={creating}>{creating ? 'Creating...' : 'Confirm and create'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
