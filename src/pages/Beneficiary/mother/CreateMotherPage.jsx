import React, { useEffect, useState } from 'react';
import { MotherFormFields } from './BeneficiaryMother';
import { calculateGestationalDetails, getInitialCheckups } from '../../../utils/beneficiaryHelpers';
import { useMothers } from '../../../context/MothersContext';
import { apiCreateMother, apiUploadMotherDocuments } from '../../../api/mothers';
import { useAuth } from '../../../auth/AuthProvider';
import { isCommunityCoordinatorRole } from '../../../utils/permissions';
import { capitalizeNameValue } from '../../../utils/nameFormat';
import { notifyAction } from '../../../components/ActionFeedback';

const MOTHER_DRAFT_KEY = 'f1kd.create-mother.draft';

const loadMotherDraft = (fallback) => {
  try {
    const savedDraft = JSON.parse(localStorage.getItem(MOTHER_DRAFT_KEY) || 'null');
    if (!savedDraft?.form) return fallback;
    const form = { ...fallback, ...savedDraft.form };
    if (savedDraft.form.ttRemarks === undefined) {
      form.ttRemarks = [1, 2, 3, 4, 5].map((num) => form[`tt${num}Remarks`]).filter(Boolean).join('; ');
    }
    return form;
  } catch (error) {
    return fallback;
  }
};

const emptyCommunityForm = (communities = []) => ({
  firstName: '',
  middleName: '',
  lastName: '',
  maidenSurname: '',
  suffix: '',
  motherId: '',
  weight: '',
  height: '',
  dob: '',
  lmpDate: '',
  eddDate: '',
  contactNumber: '',
  province: '',
  city: '',
  barangay: '',
  isHighRisk: 'No',
  programType: 'Maternal Health Program',
  emergencyName: '',
  emergencyContact: '',
  emergencyRelationship: '',
  philhealthMember: false,
  philhealthNumber: '',
  spouseName: '',
  spouseFirstName: '',
  spouseSurname: '',
  address: '',
  prenatalRegDate: '',
  trimester: '',
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
  const { currentUser } = useAuth();
  const isCommunityOrganizer = isCommunityCoordinatorRole(currentUser?.role);
  const { mothers, setMothers } = useMothers();
  const effectiveCommunities = communities && communities.length ? communities : mothers;
  const [communityForm, setCommunityForm] = useState(() => loadMotherDraft(emptyCommunityForm(effectiveCommunities)));
  const [documentFiles, setDocumentFiles] = useState({ birthCertificate: null, consent: null });
  const [createActiveTab, setCreateActiveTab] = useState(() => {
    try { return JSON.parse(localStorage.getItem(MOTHER_DRAFT_KEY) || 'null')?.activeTab || 'general'; } catch (error) { return 'general'; }
  });
  const CREATE_STEPS = ['general', 'prenatal', 'medical_dental', 'vaccine'];
  const createActiveIndex = CREATE_STEPS.indexOf(createActiveTab) >= 0 ? CREATE_STEPS.indexOf(createActiveTab) : 0;

  useEffect(() => {
    const assignedCommunity = communities[0]?.name || '';
    setCommunityForm((prev) => {
      if (isCommunityOrganizer) {
        const communityChanged = prev.community !== assignedCommunity;
        return {
          ...prev,
          community: assignedCommunity,
          ...(communityChanged ? { group: '', groupId: '', batch: '', batchId: '' } : {}),
        };
      }
      return { ...prev, community: prev.community || assignedCommunity };
    });
  }, [communities, isCommunityOrganizer]);

  useEffect(() => {
    try {
      localStorage.setItem(MOTHER_DRAFT_KEY, JSON.stringify({ form: communityForm, activeTab: createActiveTab }));
    } catch (error) {
      console.warn('[CreateMotherPage] Unable to save form draft:', error);
    }
  }, [communityForm, createActiveTab]);

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    const requiredFieldsByStep = [
      {
        tab: 'general',
        label: 'General',
        fields: [
          'firstName', 'middleName', 'lastName', 'maidenSurname', 'dob', 'contactNumber',
          'province', 'city', 'barangay', 'community', 'groupId', 'batchId',
          'emergencyName', 'emergencyContact', 'emergencyRelationship',
        ],
      },
      {
        tab: 'prenatal',
        label: 'Prenatal/OB',
        fields: [
          'lmpDate', 'eddDate', 'prenatalRegDate', 'trimester', 'gestationalAge',
          'prenatalWeight', 'prenatalBp', 'prenatalHeight', 'gravida', 'abortion', 'stillbirth',
        ],
      },
      {
        tab: 'medical_dental',
        label: 'Medical & Dental',
        fields: [],
      },
    ];
    const incompleteStep = requiredFieldsByStep.find(({ fields }) =>
      fields.some((field) => !String(communityForm[field] ?? '').trim())
    );

    if (incompleteStep) {
      setCreateActiveTab(incompleteStep.tab);
      notifyAction(`Complete the required fields in ${incompleteStep.label} before creating.`, 'error');
      return;
    }
    const hasNegativePregnancyCount = ['gravida', 'abortion', 'stillbirth']
      .some((field) => Number(communityForm[field]) < 0);
    if (hasNegativePregnancyCount) {
      setCreateActiveTab('prenatal');
      notifyAction('Gravida, abortion, and stillbirth cannot be negative.', 'error');
      return;
    }
    const initialCheckups = getInitialCheckups(
      communityForm.trimester,
      communityForm.prenatalBp,
      communityForm.prenatalWeight || communityForm.weight,
      communityForm.fundalHeight,
      communityForm.fhr,
      communityForm.prenatalRegDate,
      communityForm.lmpDate
    );
    const { gestationalAge, trimester } = calculateGestationalDetails(communityForm.lmpDate, communityForm.prenatalRegDate);
    const resolvedTrimester = trimester || communityForm.trimester;
    const resolvedGestationalAge = gestationalAge || communityForm.gestationalAge;
    const normalizedFirstName = capitalizeNameValue(communityForm.firstName.trim());
    const normalizedMiddleName = capitalizeNameValue(communityForm.middleName.trim());
    const normalizedLastName = capitalizeNameValue(communityForm.lastName.trim());
    const normalizedMaidenSurname = capitalizeNameValue(communityForm.maidenSurname.trim());
    const normalizedSuffix = capitalizeNameValue(communityForm.suffix.trim());
    const fullName = `${normalizedFirstName} ${normalizedMiddleName} ${normalizedLastName} ${normalizedMaidenSurname} ${normalizedSuffix}`
      .replace(/\s+/g, ' ')
      .trim();

    const payload = {
      firstName: normalizedFirstName,
      middleName: normalizedMiddleName,
      lastName: normalizedLastName,
      maidenSurname: normalizedMaidenSurname,
      suffix: normalizedSuffix,
      motherId: communityForm.motherId,
      dob: communityForm.dob || null,
      contactNumber: communityForm.contactNumber,
      community: communityForm.community,
      area: communityForm.area,
      address: [communityForm.province, communityForm.city, communityForm.barangay]
        .filter(Boolean)
        .join(', '),
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
      philhealthMember: communityForm.philhealthMember,
      philhealthNumber: communityForm.philhealthNumber,
      spouseName: `${communityForm.spouseFirstName} ${communityForm.spouseSurname}`.trim(),
      medicalConditions: communityForm.medicalConditions,
      otherMedicalHistory: communityForm.otherMedicalHistory,
      obHistory: communityForm.obHistory,
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
      ttRemarks: communityForm.ttRemarks,
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
      status: 'Active',
    };

    try {
      const { mother } = await apiCreateMother(payload);
      const createdMotherId = mother?.id || mother?.motherId || mother?.mother_id;
      if (createdMotherId && (documentFiles.birthCertificate || documentFiles.consent)) {
        await apiUploadMotherDocuments(createdMotherId, documentFiles);
      }
      const newCommunity = {
      id: `M-${Date.now()}`,
      name: fullName,
      firstName: communityForm.firstName.trim(),
      middleName: communityForm.middleName.trim(),
      lastName: communityForm.lastName.trim(),
      maidenSurname: communityForm.maidenSurname.trim(),
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
      spouseName: `${communityForm.spouseFirstName} ${communityForm.spouseSurname}`.trim(),
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
      ttRemarks: communityForm.ttRemarks,
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
      localStorage.removeItem(MOTHER_DRAFT_KEY);
      notifyAction('Mother created successfully.');
      navigate('/beneficiary');
    } catch (error) {
      console.error('[CreateMotherPage] Failed to create mother:', error);
      notifyAction(error?.message || 'Unable to create mother. Please try again.', 'error');
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
              documentFiles={documentFiles}
              setDocumentFiles={setDocumentFiles}
              hideSchoolField={isCommunityOrganizer}
              slashDateInput
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={() => { localStorage.removeItem(MOTHER_DRAFT_KEY); navigate('/beneficiary'); }}>Cancel</button>
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
              <button type="submit" className="btn-create-action">Create</button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
