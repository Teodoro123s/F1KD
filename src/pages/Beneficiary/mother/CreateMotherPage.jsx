import React, { useEffect, useState } from 'react';
import { MotherFormFields } from './BeneficiaryMother';
import { calculateGestationalDetails, getInitialCheckups } from '../../../utils/beneficiaryHelpers';
import { useMothers } from '../../../context/MothersContext';
import { apiCreateMother } from '../../../api/mothers';

const emptyCommunityForm = (communities = []) => ({
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  motherId: '',
  weight: '',
  height: '',
  dob: '',
  lmpDate: '',
  eddDate: '',
  contactNumber: '',
  isHighRisk: 'No',
  programType: 'Maternal Health Program',
  emergencyName: '',
  emergencyContact: '',
  emergencyRelationship: '',
  spouseName: '',
  address: '',
  prenatalRegDate: '',
  trimester: '1st Trimester',
  gestationalAge: '',
  prenatalWeight: '',
  prenatalBp: '',
  prenatalHeight: '',
  fundalHeight: '',
  fhr: '',
  gravida: '',
  para: '',
  abortion: '',
  stillbirth: '',
  obHistory: [
    { event: 'G1', gestationalAge: '', outcome: '' },
    { event: 'G2', gestationalAge: '', outcome: '' },
    { event: 'G3', gestationalAge: '', outcome: '' },
    { event: 'G4', gestationalAge: '', outcome: '' },
    { event: 'G5', gestationalAge: '', outcome: '' },
    { event: 'G6', gestationalAge: '', outcome: '' },
    { event: 'G7', gestationalAge: '', outcome: '' },
  ],
  medicalConditions: {
    hypertension: false,
    diabetes: false,
    asthma: false,
    heartDisease: false,
    kidneyDisease: false,
    epilepsy: false,
    goiter: false,
    tuberculosis: false,
    cancer: false,
    std: false,
    multiplePregnancy: false,
    prevCesarean: false,
  },
  otherMedicalHistory: '',
  dentalCheckupDate: '',
  dentalFacility: '',
  dentistInCharge: '',
  communityDentist: '',
  dentistLicense: '',
  dentistContact: '',
  teethCount: '',
  dentalFindings: '',
  dentalWork: {
    tartarRemoval: false,
    filling: false,
    cleaning: false,
    extraction: false,
    rootCanal: false,
    other: false,
  },
  dentalRemarks: '',
  tt1Date: '', tt1Remarks: '',
  tt2Date: '', tt2Remarks: '',
  tt3Date: '', tt3Remarks: '',
  tt4Date: '', tt4Remarks: '',
  tt5Date: '', tt5Remarks: '',
  area: 'Poblacion',
  community: communities[0]?.name || '',
  group: '',
  batch: '',
});

export default function CreateMotherPage({
  communities,
  groups,
  batches,
  navigate,
}) {
  const { mothers, setMothers } = useMothers();
  const effectiveCommunities = communities && communities.length ? communities : mothers;
  const [communityForm, setCommunityForm] = useState(() => emptyCommunityForm(effectiveCommunities));
  const [createActiveTab, setCreateActiveTab] = useState('general');
  const CREATE_STEPS = ['general', 'prenatal', 'medical_dental', 'vaccine'];
  const createActiveIndex = CREATE_STEPS.indexOf(createActiveTab) >= 0 ? CREATE_STEPS.indexOf(createActiveTab) : 0;

  useEffect(() => {
    setCommunityForm((prev) => ({ ...prev, community: prev.community || communities[0]?.name || '' }));
  }, [communities]);

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    if (!communityForm.firstName.trim() || !communityForm.lastName.trim()) return;

    const initialCheckups = getInitialCheckups(
      communityForm.trimester,
      communityForm.prenatalBp,
      communityForm.prenatalWeight || communityForm.weight,
      communityForm.fundalHeight,
      communityForm.fhr,
      communityForm.prenatalRegDate,
      communityForm.lmpDate
    );
    const { gestationalAge, trimester } = calculateGestationalDetails(communityForm.lmpDate);
    const resolvedTrimester = communityForm.lmpDate ? trimester : communityForm.trimester;
    const resolvedGestationalAge = communityForm.lmpDate ? gestationalAge : communityForm.gestationalAge;
    const fullName = `${communityForm.firstName.trim()} ${communityForm.middleName.trim()} ${communityForm.lastName.trim()} ${communityForm.suffix.trim()}`
      .replace(/\s+/g, ' ')
      .trim();

    const payload = {
      firstName: communityForm.firstName.trim(),
      middleName: communityForm.middleName.trim(),
      lastName: communityForm.lastName.trim(),
      suffix: communityForm.suffix.trim(),
      motherId: communityForm.motherId,
      dob: communityForm.dob || null,
      contactNumber: communityForm.contactNumber,
      community: communityForm.community,
      area: communityForm.area,
      address: communityForm.address,
      group: communityForm.group,
      batch: communityForm.batch,
      groupId: communityForm.groupId || null,
      batchId: communityForm.batchId || null,
      lmpDate: communityForm.lmpDate,
      eddDate: communityForm.eddDate,
      prenatalRegDate: communityForm.prenatalRegDate,
      trimester: resolvedTrimester,
      gestationalAge: resolvedGestationalAge,
      prenatalWeight: communityForm.prenatalWeight,
      prenatalBp: communityForm.prenatalBp,
      prenatalHeight: communityForm.prenatalHeight,
      fundalHeight: communityForm.fundalHeight,
      fhr: communityForm.fhr,
      gravida: communityForm.gravida,
      para: communityForm.para,
      abortion: communityForm.abortion,
      stillbirth: communityForm.stillbirth,
      weight: communityForm.weight,
      height: communityForm.height,
      isHighRisk: communityForm.isHighRisk,
      programType: communityForm.programType,
      emergencyName: communityForm.emergencyName,
      emergencyContact: communityForm.emergencyContact,
      emergencyRelationship: communityForm.emergencyRelationship,
      spouseName: communityForm.spouseName,
      medicalConditions: communityForm.medicalConditions,
      otherMedicalHistory: communityForm.otherMedicalHistory,
      dentalCheckupDate: communityForm.dentalCheckupDate,
      dentalFacility: communityForm.dentalFacility,
      dentalFindings: communityForm.dentalFindings,
      dentalRemarks: communityForm.dentalRemarks,
      status: 'Active',
    };

    try {
      const { mother } = await apiCreateMother(payload);
      const newCommunity = {
      id: `M-${Date.now()}`,
      name: fullName,
      firstName: communityForm.firstName.trim(),
      middleName: communityForm.middleName.trim(),
      lastName: communityForm.lastName.trim(),
      suffix: communityForm.suffix.trim(),
      motherId: communityForm.motherId,
      weight: communityForm.weight,
      height: communityForm.height,
      dob: communityForm.dob,
      lmpDate: communityForm.lmpDate,
      eddDate: communityForm.eddDate,
      contactNumber: communityForm.contactNumber,
      isHighRisk: communityForm.isHighRisk,
      programType: communityForm.programType,
      emergencyName: communityForm.emergencyName,
      emergencyContact: communityForm.emergencyContact,
      emergencyRelationship: communityForm.emergencyRelationship,
      spouseName: communityForm.spouseName,
      address: communityForm.address,
      prenatalRegDate: communityForm.prenatalRegDate,
      trimester: resolvedTrimester,
      gestationalAge: resolvedGestationalAge,
      prenatalWeight: communityForm.prenatalWeight,
      prenatalBp: communityForm.prenatalBp,
      prenatalHeight: communityForm.prenatalHeight,
      fundalHeight: communityForm.fundalHeight,
      fhr: communityForm.fhr,
      gravida: communityForm.gravida,
      para: communityForm.para,
      abortion: communityForm.abortion,
      stillbirth: communityForm.stillbirth,
      obHistory: communityForm.obHistory,
      medicalConditions: communityForm.medicalConditions,
      otherMedicalHistory: communityForm.otherMedicalHistory,
      dentalCheckupDate: communityForm.dentalCheckupDate,
      dentalFacility: communityForm.dentalFacility,
      dentistInCharge: communityForm.dentistInCharge,
      communityDentist: communityForm.communityDentist,
      dentistLicense: communityForm.dentistLicense,
      dentistContact: communityForm.dentistContact,
      teethCount: communityForm.teethCount,
      dentalFindings: communityForm.dentalFindings,
      dentalWork: communityForm.dentalWork,
      dentalRemarks: communityForm.dentalRemarks,
      tt1Date: communityForm.tt1Date,
      tt1Remarks: communityForm.tt1Remarks,
      tt2Date: communityForm.tt2Date,
      tt2Remarks: communityForm.tt2Remarks,
      tt3Date: communityForm.tt3Date,
      tt3Remarks: communityForm.tt3Remarks,
      tt4Date: communityForm.tt4Date,
      tt4Remarks: communityForm.tt4Remarks,
      tt5Date: communityForm.tt5Date,
      tt5Remarks: communityForm.tt5Remarks,
      area: communityForm.area,
      community: communityForm.community,
      group: communityForm.group,
      batch: communityForm.batch,
      records: 0,
      progress: 0,
      checkups: initialCheckups,
      };

      if (typeof setMothers === 'function') {
        setMothers((prev) => [{ ...newCommunity, ...mother }, ...prev]);
      }
      navigate('/beneficiary');
    } catch (error) {
      console.error('[CreateMotherPage] Failed to create mother:', error);
      window.alert(error.message || 'Unable to create mother.');
    }
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
        <form onSubmit={handleCreateCommunity}>
          <div className="modal-body-scrollable">
            <MotherFormFields
              activeTab={createActiveTab}
              form={communityForm}
              setForm={setCommunityForm}
              communities={communities}
              groups={groups}
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
