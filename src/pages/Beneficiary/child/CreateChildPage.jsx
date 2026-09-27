import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChildFormFields } from './BeneficiaryChild';
import { useMothers } from '../../../context/MothersContext';
import { capitalizeNameValue } from '../../../utils/nameFormat';
import { notifyAction } from '../../../components/ActionFeedback';

const CHILD_DRAFT_KEY = 'f1kd.create-child.draft';

const loadChildDraft = (fallback) => {
  try {
    const savedDraft = JSON.parse(localStorage.getItem(CHILD_DRAFT_KEY) || 'null');
    return savedDraft?.form ? { ...fallback, ...savedDraft.form } : fallback;
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
  gender: 'Male',
  bloodType: '',
  noOfChildDelivered: '',
  multipleBirthType: '',
  expandedNewbornScreening: '',
  expandedNewbornScreeningResult: '',
  deliveryType: 'Vaginal',
  assignedBatchIds: [],
  leader: '',
  members: 1,
  status: 'Active',
  birthPlace: '',
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
  bcgDate: '',
  bcgRemarks: '',
  hepbDate: '',
  hepbRemarks: '',
  opvDate: '',
  opvRemarks: '',
  dptDate: '',
  dptRemarks: '',
  mmrDate: '',
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
  const [selectedMotherId, setSelectedMotherId] = useState(() => {
    try { return motherFromState?.id || motherFromState?.motherId || JSON.parse(localStorage.getItem(CHILD_DRAFT_KEY) || 'null')?.selectedMotherId || ''; } catch (error) { return motherFromState?.id || motherFromState?.motherId || ''; }
  });
  const [createActiveTab, setCreateActiveTab] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHILD_DRAFT_KEY) || 'null')?.activeTab || 'general'; } catch (error) { return 'general'; }
  });
  const CREATE_STEPS = ['general', 'prenatal', 'medical_dental', 'vaccine'];
  const createActiveIndex = CREATE_STEPS.indexOf(createActiveTab) >= 0 ? CREATE_STEPS.indexOf(createActiveTab) : 0;

  const selectedMother = motherFromState || availableMothers.find((mother) => (
    String(mother.id || mother.motherId || '') === String(selectedMotherId)
  ));

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
      localStorage.setItem(CHILD_DRAFT_KEY, JSON.stringify({ form: groupForm, selectedMotherId, activeTab: createActiveTab }));
    } catch (error) {
      console.warn('[CreateChildPage] Unable to save form draft:', error);
    }
  }, [groupForm, selectedMotherId, createActiveTab]);

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
      setCreateActiveTab(CREATE_STEPS[Math.min(currentIndex + 1, CREATE_STEPS.length - 1)]);
      return;
    }
    if (!motherFromState && !selectedMotherId) {
      notifyAction('Please select a mother before creating the child.', 'error');
      return;
    }
    if (!groupForm.firstName.trim() || !groupForm.lastName.trim()) {
      notifyAction('Please complete the required child details before saving.', 'error');
      setCreateActiveTab('general');
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
      gender: groupForm.gender || null,
      bloodType: groupForm.bloodType || null,
      noOfChildDelivered: groupForm.noOfChildDelivered || null,
      multipleBirthType: groupForm.multipleBirthType || null,
      expandedNewbornScreening: groupForm.expandedNewbornScreening || null,
      expandedNewbornScreeningResult: groupForm.expandedNewbornScreeningResult || null,
      deliveryType: groupForm.deliveryType || null,
      community: selectedMother?.community || selectedMother?.raw?.community_name || selectedMother?.raw?.community || null,
      batch: selectedMother?.batch || selectedMother?.raw?.batch_name || selectedMother?.raw?.batch || null,
      birthPlace: groupForm.birthPlace || null,
      birthAttendant: groupForm.birthAttendant || null,
      apgarScore: groupForm.apgarScore || null,
      nutritionNotes: groupForm.nutritionNotes || null,
      medicalConditions: groupForm.medicalConditions || {},
      bcgDate: groupForm.bcgDate || null,
      bcgRemarks: groupForm.bcgRemarks || null,
      hepbDate: groupForm.hepbDate || null,
      hepbRemarks: groupForm.hepbRemarks || null,
      opvDate: groupForm.opvDate || null,
      opvRemarks: groupForm.opvRemarks || null,
      dptDate: groupForm.dptDate || null,
      dptRemarks: groupForm.dptRemarks || null,
      mmrDate: groupForm.mmrDate || null,
      mmrRemarks: groupForm.mmrRemarks || null,
    };

    setPendingChild({ payload, fullName });
  };

  const confirmCreateChild = async () => {
    if (!pendingChild || creating) return;
    setCreating(true);

    try {
      const { apiCreateChild, apiUploadChildBirthDocument } = await import('../../../api/children');
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
        birthPlace: child.birth_place || groupForm.birthPlace,
        birthAttendant: child.birth_attendant || groupForm.birthAttendant,
        apgarScore: child.apgar_score || groupForm.apgarScore,
        nutritionNotes: child.nutrition_notes || groupForm.nutritionNotes,
        medicalConditions: groupForm.medicalConditions,
        medicalRemarks: groupForm.medicalRemarks,
        bcgDate: child.bcg_date || groupForm.bcgDate,
        bcgRemarks: child.bcg_remarks || groupForm.bcgRemarks,
        hepbDate: child.hepb_date || groupForm.hepbDate,
        hepbRemarks: child.hepb_remarks || groupForm.hepbRemarks,
        opvDate: child.opv_date || groupForm.opvDate,
        opvRemarks: child.opv_remarks || groupForm.opvRemarks,
        dptDate: child.dpt_date || groupForm.dptDate,
        dptRemarks: child.dpt_remarks || groupForm.dptRemarks,
        mmrDate: child.mmr_date || groupForm.mmrDate,
        mmrRemarks: child.mmr_remarks || groupForm.mmrRemarks,
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
        navigate(`/beneficiary/child/${newGroup.id}`, { state: { mother: updatedMother, child: newGroup, mothers: undefined } });
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
    if (currentIndex < CREATE_STEPS.length - 1) {
      setCreateActiveTab(CREATE_STEPS[currentIndex + 1]);
    }
  };

  return (
    <section className="tabs-row create-view">
      {/* Header showing mother info when available */}
      {motherFromState && (
        <div className="create-child-header" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>Create Child for {motherFromState.name || `${motherFromState.firstName || ''} ${motherFromState.lastName || ''}`.trim()}</h2>
            {motherFromState.program && <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{motherFromState.program}</div>}
          </div>
          <div>
            <button className="btn-secondary" onClick={() => {
              const mid = motherFromState.id || motherFromState.motherId || null;
              if (mid) {
                navigate(`/beneficiary/mother/${mid}`, { state: { mother: motherFromState } });
              } else {
                navigate('/beneficiary');
              }
            }}>Cancel</button>
          </div>
        </div>
      )}

      {!motherFromState && (
        <div className="form-group" style={{ maxWidth: 520, marginBottom: 16 }}>
          <label className="form-label" htmlFor="child-mother-select">Mother</label>
          <select
            id="child-mother-select"
            className="form-select"
            value={selectedMotherId}
            onChange={(event) => setSelectedMotherId(event.target.value)}
            required
          >
            <option value="">Select mother</option>
            {availableMothers.map((mother) => (
              <option key={mother.id || mother.motherId} value={mother.id || mother.motherId}>
                {mother.name || `${mother.firstName || ''} ${mother.lastName || ''}`.trim()}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="stepper-progress">
        <div className="stepper-steps" role="tablist">
          {CREATE_STEPS.map((s, i) => {
            const label = s === 'general' ? 'General' : s === 'prenatal' ? 'Prenatal/OB' : s === 'medical_dental' ? 'Medical & Dental' : 'Vaccine';
            const isActive = createActiveTab === s;
            const isCompleted = i < createActiveIndex;
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={isActive}
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
      </div>

      <div className="create-form-body">
        <form onSubmit={handleCreateGroup}>
          <div className="modal-body-scrollable">
            <ChildFormFields
              activeTab={createActiveTab}
              form={groupForm}
              setForm={setGroupForm}
              communities={communities}
              batches={batches}
              birthDocumentFile={birthDocumentFile}
              setBirthDocumentFile={setBirthDocumentFile}
            />
          </div>
          <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={() => {
            localStorage.removeItem(CHILD_DRAFT_KEY);
            if (motherFromState) navigate(`/beneficiary/mother/${motherFromState.id || motherFromState.motherId}`, { state: { mother: motherFromState } });
            else navigate('/beneficiary');
          }}>Cancel</button>
          {createActiveTab !== 'general' && (
              <button type="button" className="btn-secondary btn-back" onClick={() => {
                if (createActiveTab === 'vaccine') setCreateActiveTab('medical_dental');
                else if (createActiveTab === 'medical_dental') setCreateActiveTab('prenatal');
                else setCreateActiveTab('general');
              }}>Back</button>
            )}
            {createActiveTab !== 'vaccine' ? (
              <button type="button" className="btn-primary btn-next" onClick={handleNextStep}>Next</button>
            ) : (
              <button type="submit" className="btn-create-action">Create</button>
            )}
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
