import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChildFormFields } from './BeneficiaryChild';
import { useMothers } from '../../../context/MothersContext';

const emptyGroupForm = (communities = []) => ({
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  birthDate: '',
  birthWeight: '',
  birthLength: '',
  gender: '',
  deliveryType: '',
  healthStatus: '',
  community: communities[0]?.name || '',
  assignedBatchIds: [],
  leader: '',
  members: 1,
  status: 'Active',
  birthPlace: '',
  birthAttendant: '',
  apgarScore: '',
  feedingType: '',
  nutritionNotes: '',
  fatherName: '',
  relationship: '',
  address: '',
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
  setGroups,
  navigate,
}) {
  const location = useLocation();
  const motherFromState = location.state?.mother || null;
  const { mothers, setMothers } = useMothers();
  const effectiveCommunities = communities && communities.length ? communities : mothers;
  const [groupForm, setGroupForm] = useState(() => emptyGroupForm(effectiveCommunities));
  const [createActiveTab, setCreateActiveTab] = useState('general');
  const CREATE_STEPS = ['general', 'prenatal', 'medical_dental', 'vaccine'];
  const createActiveIndex = CREATE_STEPS.indexOf(createActiveTab) >= 0 ? CREATE_STEPS.indexOf(createActiveTab) : 0;

  useEffect(() => {
    setGroupForm((prev) => ({ ...prev, community: prev.community || communities[0]?.name || '' }));
  }, [communities]);

  // If navigated from a mother, prefill mother-related fields and show mother info
  useEffect(() => {
    if (motherFromState) {
      setGroupForm((prev) => ({
        ...prev,
        motherId: motherFromState.id || motherFromState.motherId || prev.motherId || null,
        community: prev.community || motherFromState.community || motherFromState.area || prev.community || '',
      }));
    }
  }, [motherFromState]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupForm.firstName.trim() || !groupForm.lastName.trim()) return;

    const fullName = `${groupForm.firstName.trim()} ${groupForm.middleName.trim()} ${groupForm.lastName.trim()} ${groupForm.suffix.trim()}`
      .replace(/\s+/g, ' ')
      .trim();

    const payload = {
      motherId: motherFromState?.id || motherFromState?.motherId || null,
      firstName: groupForm.firstName.trim(),
      middleName: groupForm.middleName.trim(),
      lastName: groupForm.lastName.trim(),
      suffix: groupForm.suffix.trim(),
      birthDate: groupForm.birthDate || null,
      birthWeight: groupForm.birthWeight || null,
      birthLength: groupForm.birthLength || null,
      gender: groupForm.gender || null,
      deliveryType: groupForm.deliveryType || null,
      healthStatus: groupForm.healthStatus || null,
      community: groupForm.community || null,
      batch: groupForm.batch || null,
      birthPlace: groupForm.birthPlace || null,
      birthAttendant: groupForm.birthAttendant || null,
      apgarScore: groupForm.apgarScore || null,
      feedingType: groupForm.feedingType || null,
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
      fatherName: groupForm.fatherName || '',
      relationship: groupForm.relationship || '',
      address: groupForm.address || '',
    };

    try {
      // call backend to create child
      const { child } = await (await import('../../../api/children')).then(mod => mod.apiCreateChild(payload));

      const newGroup = {
        id: child.id || `G-${Date.now()}`,
        name: fullName,
        firstName: child.first_name || child.firstName || groupForm.firstName.trim(),
        middleName: child.middle_name || child.middleName || groupForm.middleName.trim(),
        lastName: child.last_name || child.lastName || groupForm.lastName.trim(),
        suffix: child.suffix || groupForm.suffix.trim(),
        birthDate: child.birth_date || child.birthDate || groupForm.birthDate,
        birthWeight: child.birth_weight || child.birthWeight || groupForm.birthWeight,
        birthLength: child.birth_length || child.birthLength || groupForm.birthLength,
        gender: child.gender || groupForm.gender,
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
        feedingType: child.feeding_type || groupForm.feedingType,
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
        fatherName: child.father_name || child.fatherName || groupForm.fatherName || '',
        relationship: child.relationship || groupForm.relationship || '',
        address: child.address || groupForm.address || '',
        progress: child.progress || 0,
        childCheckups: null,
      };

      // add to groups list
      setGroups((prev) => [newGroup, ...prev]);

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
      try { alert(`Failed to create child: ${err.message || err}`); } catch (e) {}
    }
  };

  return (
    <section className="tabs-row create-view">
      {/* Header showing mother info when available */}
      {motherFromState && (
        <div className="create-child-header" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>Create Child for {motherFromState.name || `${motherFromState.firstName || ''} ${motherFromState.lastName || ''}`.trim()}</h2>
            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>{motherFromState.motherId || motherFromState.id ? `${motherFromState.motherId || motherFromState.id}` : ''} {motherFromState.program ? `• ${motherFromState.program}` : ''}</div>
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
            />
          </div>
          <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={() => {
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
              <button type="button" className="btn-primary btn-next" onClick={() => {
                if (createActiveTab === 'general') setCreateActiveTab('prenatal');
                else if (createActiveTab === 'prenatal') setCreateActiveTab('medical_dental');
                else if (createActiveTab === 'medical_dental') setCreateActiveTab('vaccine');
              }}>Next</button>
            ) : (
              <button type="submit" className="btn-primary">Create</button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
