import React, { useEffect, useState } from 'react';
import { MotherFormFields, OTHER_MATERNAL_VACCINES } from './BeneficiaryMother';
import { calculateGestationalDetails, getInitialCheckups } from '../../../utils/beneficiaryHelpers';
import { useMothers } from '../../../context/MothersContext';
import { apiCreateMother, apiUploadMotherDocuments } from '../../../api/mothers';
import { useAuth } from '../../../auth/AuthProvider';
import { isCommunityCoordinatorRole } from '../../../utils/permissions';
import { capitalizeNameValue } from '../../../utils/nameFormat';
import { notifyAction } from '../../../components/ActionFeedback';
import { CONTACT_NUMBER_POLICY, isValidContactNumber } from '../../../utils/contactNumber';
import { getPhilHealthNumberError } from '../../../utils/philHealthNumber';
import { calculateTotalChildren, getMaternalBirthCountErrors } from '../../../utils/maternalBirthCounts';
import { getMotherIdentityErrors } from '../../../utils/motherIdentity';
import { hasMaternalHighRiskTriggers } from '../../../utils/maternalRisk';
import { getMaternalVaccineDateErrors } from '../../../utils/maternalVaccineDates';

const MOTHER_DRAFT_KEY = 'f1kd.create-mother.draft';
const MATERNAL_BIRTH_COUNT_INPUT_IDS = {
  childrenBornAlive: 'ob-born-alive',
  childrenDiedAfterBirth: 'ob-died-after-birth',
  miscarriages: 'ob-miscarriages',
  totalChildren: 'ob-total-children',
};
const MOTHER_IDENTITY_INPUT_IDS = {
  firstName: 'mother-first-name',
  middleName: 'mother-middle-name',
  lastName: 'mother-last-name',
  maidenSurname: 'mother-maiden-surname',
  suffix: 'mother-suffix',
  dob: 'mother-dob',
  contactNumber: 'mother-contact',
};
const REQUIRED_FIELDS_BY_STEP = [
  {
    tab: 'general',
    label: 'General',
    fields: [
      'firstName',
      'lastName',
      'dob',
      'contactNumber',
      'civilStatus',
      'employmentStatus',
      'educationalAttainment',
      'province',
      'city',
      'barangay',
      'community',
      'groupId',
      'emergencyName',
      'emergencyContact',
      'emergencyRelationship',
    ],
  },
  {
    tab: 'prenatal',
    label: 'Prenatal/OB',
    fields: [
      'lmpDate',
      'prenatalRegDate',
      'prenatalWeight',
      'prenatalBp',
      'prenatalHeight',
      'childrenBornAlive',
      'childrenDiedAfterBirth',
      'miscarriages',
    ],
  },
  {
    tab: 'medical_dental',
    label: 'Medical & dental',
    fields: [],
  },
];

const loadMotherDraft = (fallback) => {
  try {
    const savedDraft = JSON.parse(localStorage.getItem(MOTHER_DRAFT_KEY) || 'null');
    if (!savedDraft?.form) return fallback;
    const form = { ...fallback, ...savedDraft.form };
    form.totalChildren = calculateTotalChildren(form.childrenBornAlive, form.childrenDiedAfterBirth);
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
  birthPlace: '',
  bloodType: '',
  civilStatus: '',
  employmentStatus: '',
  educationalAttainment: '',
  lmpDate: '',
  eddDate: '',
  eddDateOverridden: false,
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
  totalChildren: '',
  childrenBornAlive: '',
  miscarriages: '',
  childrenDiedAfterBirth: '',
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
    parasitism: false,
    anemia: false,
    urinaryTractInfection: false,
    genitalTractInfection: false,
    smoking: false,
    alcoholIntake: false,
    illegalDrugUse: false,
    otherInfectiousDisease: false,
    cancer: false,
    std: false,
    multiplePregnancy: false,
    prevCesarean: false,
    eclampsia: false,
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
  influenzaDate: '', influenzaRemarks: '',
  influenzaDose2Date: '', influenzaDose3Date: '',
  hepatitisADate: '', hepatitisARemarks: '',
  hepatitisADose2Date: '', hepatitisADose3Date: '',
  hepatitisBDate: '', hepatitisBRemarks: '',
  hepatitisBDose2Date: '', hepatitisBDose3Date: '',
  covid19Date: '', covid19Remarks: '',
  covid19Dose2Date: '', covid19Dose3Date: '',
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
  const [showRequiredValidation, setShowRequiredValidation] = useState(false);
  const [createActiveTab, setCreateActiveTab] = useState('general');
  const maternalBirthCountErrors = getMaternalBirthCountErrors(communityForm);
  const vaccineDateErrors = getMaternalVaccineDateErrors(communityForm);
  const motherIdentityErrors = showRequiredValidation ? getMotherIdentityErrors(communityForm) : {};
  const dentistLicenseValue = String(communityForm.dentistLicense ?? '').trim();
  const dentistLicenseError = dentistLicenseValue && !/^\d+$/.test(dentistLicenseValue)
    ? 'Dentist license number must contain digits only.'
    : String(communityForm.dentalCheckupDate ?? '').trim() && showRequiredValidation && !dentistLicenseValue
      ? 'Dentist license number is required.'
      : '';
  const isHighRisk = hasMaternalHighRiskTriggers(communityForm);
  const CREATE_STEPS = ['general', 'prenatal', 'medical_dental', 'vaccine'];
  const createActiveIndex = CREATE_STEPS.indexOf(createActiveTab) >= 0 ? CREATE_STEPS.indexOf(createActiveTab) : 0;
  const createStepLabels = ['General information', 'Prenatal / OB', 'Medical & dental', 'Vaccines'];
  const focusMotherIdentityField = (field) => {
    const inputId = MOTHER_IDENTITY_INPUT_IDS[field];
    if (inputId) window.setTimeout(() => document.getElementById(inputId)?.focus(), 0);
  };

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
      localStorage.setItem(MOTHER_DRAFT_KEY, JSON.stringify({ form: communityForm }));
    } catch (error) {
      console.warn('[CreateMotherPage] Unable to save form draft:', error);
    }
  }, [communityForm]);

  const handleNextStep = () => {
    const currentStep = REQUIRED_FIELDS_BY_STEP.find((step) => step.tab === createActiveTab);
    const requiredFields = currentStep
      ? currentStep.fields.filter((field) => field !== 'community' || !isCommunityOrganizer)
      : [];
    if (createActiveTab === 'general' && communityForm.philhealthMember) {
      requiredFields.push('philhealthNumber');
    }
    if (createActiveTab === 'prenatal' && communityForm.eddDateOverridden) {
      requiredFields.push('eddDate');
    }
    if (createActiveTab === 'medical_dental' && communityForm.dentalCheckupDate) {
      requiredFields.push('dentistLicense');
    }
    const hasMissingRequiredField = requiredFields.some((field) =>
      !String(communityForm[field] ?? '').trim()
    );
    if (hasMissingRequiredField) {
      setShowRequiredValidation(true);
      notifyAction(`Complete the required fields in ${currentStep.label} before continuing.`, 'error');
      return;
    }
    if (createActiveTab === 'general') {
      const identityErrors = getMotherIdentityErrors(communityForm);
      const invalidField = Object.keys(identityErrors)[0];
      if (invalidField) {
        setShowRequiredValidation(true);
        focusMotherIdentityField(invalidField);
        notifyAction(identityErrors[invalidField], 'error');
        return;
      }
    }
    if (createActiveTab === 'general' && communityForm.philhealthMember) {
      const philHealthNumberError = getPhilHealthNumberError(communityForm.philhealthNumber, true);
      if (philHealthNumberError) {
        notifyAction(philHealthNumberError, 'error');
        return;
      }
    }
    if (createActiveTab === 'prenatal' && Object.keys(maternalBirthCountErrors).length > 0) {
      const [field, message] = Object.entries(maternalBirthCountErrors)[0];
      document.getElementById(MATERNAL_BIRTH_COUNT_INPUT_IDS[field])?.focus();
      notifyAction(message, 'error');
      return;
    }
    if (createActiveTab === 'medical_dental' && dentistLicenseError) {
      setShowRequiredValidation(true);
      notifyAction(dentistLicenseError, 'error');
      document.getElementById('dentist-license')?.focus();
      return;
    }
    if (createActiveTab === 'general') setCreateActiveTab('prenatal');
    else if (createActiveTab === 'prenatal') setCreateActiveTab('medical_dental');
    else if (createActiveTab === 'medical_dental') setCreateActiveTab('vaccine');
  };

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    const requiredFieldsByStep = REQUIRED_FIELDS_BY_STEP.map((step) => ({
      ...step,
      fields: [
        ...step.fields.filter((field) => field !== 'community' || !isCommunityOrganizer),
        ...(step.tab === 'general' && communityForm.philhealthMember ? ['philhealthNumber'] : []),
        ...(step.tab === 'prenatal' && communityForm.eddDateOverridden ? ['eddDate'] : []),
        ...(step.tab === 'medical_dental' && communityForm.dentalCheckupDate ? ['dentistLicense'] : []),
      ],
    }));
    const incompleteStep = requiredFieldsByStep.find(({ fields }) =>
      fields.some((field) => !String(communityForm[field] ?? '').trim())
    );

    if (incompleteStep) {
      setShowRequiredValidation(true);
      setCreateActiveTab(incompleteStep.tab);
      notifyAction(`Complete the required fields in ${incompleteStep.label} before creating.`, 'error');
      return;
    }
    const identityErrors = getMotherIdentityErrors(communityForm);
    const invalidIdentityField = Object.keys(identityErrors)[0];
    if (invalidIdentityField) {
      setShowRequiredValidation(true);
      setCreateActiveTab('general');
      focusMotherIdentityField(invalidIdentityField);
      notifyAction(identityErrors[invalidIdentityField], 'error');
      return;
    }
    const philHealthNumberError = getPhilHealthNumberError(
      communityForm.philhealthNumber,
      Boolean(communityForm.philhealthMember),
    );
    if (philHealthNumberError) {
      setCreateActiveTab('general');
      notifyAction(philHealthNumberError, 'error');
      return;
    }
    const invalidContact = [
      { field: 'contactNumber', label: 'Contact number', tab: 'general' },
      { field: 'emergencyContact', label: 'Emergency contact number', tab: 'general' },
      { field: 'dentistContact', label: 'Dentist contact number', tab: 'medical_dental' },
    ].find(({ field }) => String(communityForm[field] ?? '').trim() && !isValidContactNumber(communityForm[field]));
    if (invalidContact) {
      setCreateActiveTab(invalidContact.tab);
      notifyAction(`${invalidContact.label}: ${CONTACT_NUMBER_POLICY}`, 'error');
      return;
    }
    if (Object.keys(maternalBirthCountErrors).length > 0) {
      setCreateActiveTab('prenatal');
      const message = Object.values(maternalBirthCountErrors)[0];
      notifyAction(message, 'error');
      return;
    }
    if (dentistLicenseError) {
      setShowRequiredValidation(true);
      setCreateActiveTab('medical_dental');
      notifyAction(dentistLicenseError, 'error');
      document.getElementById('dentist-license')?.focus();
      return;
    }
    if (Object.keys(vaccineDateErrors).length > 0) {
      setCreateActiveTab('vaccine');
      notifyAction(Object.values(vaccineDateErrors)[0], 'error');
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
      birthPlace: communityForm.birthPlace,
      bloodType: communityForm.bloodType,
      civilStatus: communityForm.civilStatus,
      employmentStatus: communityForm.employmentStatus,
      educationalAttainment: communityForm.educationalAttainment,
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
      totalChildren: communityForm.totalChildren,
      childrenBornAlive: communityForm.childrenBornAlive,
      miscarriages: communityForm.miscarriages,
      childrenDiedAfterBirth: communityForm.childrenDiedAfterBirth,
      weight: communityForm.weight,
      height: communityForm.height,
      isHighRisk: isHighRisk || communityForm.isHighRisk === 'Yes' ? 'Yes' : 'No',
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
      influenzaDate: communityForm.influenzaDate,
      influenzaRemarks: communityForm.influenzaRemarks,
      ...Object.fromEntries(OTHER_MATERNAL_VACCINES.flatMap(({ key }) => [2, 3].map((num) => [
        `${key}Dose${num}Date`,
        communityForm[`${key}Dose${num}Date`],
      ]))),
      hepatitisADate: communityForm.hepatitisADate,
      hepatitisARemarks: communityForm.hepatitisARemarks,
      hepatitisBDate: communityForm.hepatitisBDate,
      hepatitisBRemarks: communityForm.hepatitisBRemarks,
      covid19Date: communityForm.covid19Date,
      covid19Remarks: communityForm.covid19Remarks,
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
      birthPlace: communityForm.birthPlace,
      bloodType: communityForm.bloodType,
      civilStatus: communityForm.civilStatus,
      employmentStatus: communityForm.employmentStatus,
      educationalAttainment: communityForm.educationalAttainment,
      lmpDate: communityForm.lmpDate,
      eddDate: communityForm.eddDate,
      contactNumber: communityForm.contactNumber,
      isHighRisk: isHighRisk || communityForm.isHighRisk === 'Yes' ? 'Yes' : 'No',
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
      totalChildren: communityForm.totalChildren,
      childrenBornAlive: communityForm.childrenBornAlive,
      miscarriages: communityForm.miscarriages,
      childrenDiedAfterBirth: communityForm.childrenDiedAfterBirth,
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
      influenzaDate: communityForm.influenzaDate,
      influenzaRemarks: communityForm.influenzaRemarks,
      ...Object.fromEntries(OTHER_MATERNAL_VACCINES.flatMap(({ key }) => [2, 3].map((num) => [
        `${key}Dose${num}Date`,
        communityForm[`${key}Dose${num}Date`],
      ]))),
      hepatitisADate: communityForm.hepatitisADate,
      hepatitisARemarks: communityForm.hepatitisARemarks,
      hepatitisBDate: communityForm.hepatitisBDate,
      hepatitisBRemarks: communityForm.hepatitisBRemarks,
      covid19Date: communityForm.covid19Date,
      covid19Remarks: communityForm.covid19Remarks,
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
      <header className="create-mother-page-header">
        <div>
          <span className="create-mother-eyebrow">Beneficiary registration</span>
          <h1 className="create-mother-page-title">Create Mother Profile</h1>
          <p className="create-mother-page-subtitle">Enter the available details, then move through each section to complete the profile.</p>
        </div>
        <span className="create-mother-step-count">Step {createActiveIndex + 1} of {CREATE_STEPS.length}</span>
      </header>

      <nav className="stepper-progress create-mother-stepper" aria-label="Mother profile sections">
        <div className="stepper-steps" role="tablist" aria-label="Form sections">
          {CREATE_STEPS.map((s, i) => {
            const label = createStepLabels[i];
            const isActive = createActiveTab === s;
            const isCompleted = i < createActiveIndex;
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="create-mother-step-content"
                id={`create-mother-step-${s}`}
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
        <form className="create-mother-form" onSubmit={handleCreateCommunity}>
          <div className="create-mother-form-note">
            <span className="create-mother-form-note-mark" aria-hidden="true">*</span>
            <p>Fields marked <strong>required</strong> must be completed. Other details are optional.</p>
          </div>
          <div
            className="create-mother-fields"
            id="create-mother-step-content"
            role="tabpanel"
            aria-labelledby={`create-mother-step-${createActiveTab}`}
          >
            <MotherFormFields
              activeTab={createActiveTab}
              form={communityForm}
              setForm={setCommunityForm}
              calculateBirthCountTotal
              communities={communities}
              groups={groups}
              batches={batches}
              documentFiles={documentFiles}
              setDocumentFiles={setDocumentFiles}
              hideSchoolField={isCommunityOrganizer}
              slashDateInput
              showRequiredValidation={showRequiredValidation}
              enforceRequiredFields
              validationErrors={{
                ...maternalBirthCountErrors,
                ...motherIdentityErrors,
                ...vaccineDateErrors,
                ...(dentistLicenseError ? { dentistLicense: dentistLicenseError } : {}),
              }}
            />
          </div>

          <div className="create-mother-footer">
            <button type="button" className="btn-secondary create-mother-cancel" onClick={() => { localStorage.removeItem(MOTHER_DRAFT_KEY); navigate('/beneficiary'); }}>Cancel</button>
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
                <button type="submit" className="btn-create-action">Create Mother</button>
              )}
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
