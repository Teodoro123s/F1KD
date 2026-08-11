import React, { useEffect, useState } from 'react';
import { ChildFormFields } from './BeneficiaryChild';

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
  const [groupForm, setGroupForm] = useState(() => emptyGroupForm(communities));
  const [createActiveTab, setCreateActiveTab] = useState('general');
  const CREATE_STEPS = ['general', 'prenatal', 'medical_dental', 'vaccine'];
  const createActiveIndex = CREATE_STEPS.indexOf(createActiveTab) >= 0 ? CREATE_STEPS.indexOf(createActiveTab) : 0;

  useEffect(() => {
    setGroupForm((prev) => ({ ...prev, community: prev.community || communities[0]?.name || '' }));
  }, [communities]);

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!groupForm.firstName.trim() || !groupForm.lastName.trim()) return;

    const fullName = `${groupForm.firstName.trim()} ${groupForm.middleName.trim()} ${groupForm.lastName.trim()} ${groupForm.suffix.trim()}`
      .replace(/\s+/g, ' ')
      .trim();

    const newGroup = {
      id: `G-${Date.now()}`,
      name: fullName,
      firstName: groupForm.firstName.trim(),
      middleName: groupForm.middleName.trim(),
      lastName: groupForm.lastName.trim(),
      suffix: groupForm.suffix.trim(),
      birthDate: groupForm.birthDate,
      birthWeight: groupForm.birthWeight,
      birthLength: groupForm.birthLength,
      gender: groupForm.gender,
      deliveryType: groupForm.deliveryType,
      healthStatus: groupForm.healthStatus,
      community: groupForm.community,
      batch: groupForm.batch,
      assignedBatchIds: groupForm.assignedBatchIds || [],
      leader: groupForm.leader,
      members: groupForm.members,
      status: groupForm.status,
      birthPlace: groupForm.birthPlace,
      birthAttendant: groupForm.birthAttendant,
      apgarScore: groupForm.apgarScore,
      feedingType: groupForm.feedingType,
      nutritionNotes: groupForm.nutritionNotes,
      medicalConditions: groupForm.medicalConditions,
      medicalRemarks: groupForm.medicalRemarks,
      bcgDate: groupForm.bcgDate,
      bcgRemarks: groupForm.bcgRemarks,
      hepbDate: groupForm.hepbDate,
      hepbRemarks: groupForm.hepbRemarks,
      opvDate: groupForm.opvDate,
      opvRemarks: groupForm.opvRemarks,
      dptDate: groupForm.dptDate,
      dptRemarks: groupForm.dptRemarks,
      mmrDate: groupForm.mmrDate,
      mmrRemarks: groupForm.mmrRemarks,
      address: groupForm.address || '',
      progress: 0,
      childCheckups: null,
    };

    setGroups((prev) => [newGroup, ...prev]);
    navigate('/beneficiary');
  };

  return (
    <section className="tabs-row create-view">
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
            <button type="button" className="btn-secondary" onClick={() => navigate('/beneficiary')}>Cancel</button>
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
