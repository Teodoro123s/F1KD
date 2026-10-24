import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChildFormFields } from './BeneficiaryChild';
import { apiGetChild, apiUpdateChild, apiUploadChildBirthDocument } from '../../../api/children';
import { getSummary } from '../../Community/communityService';
import { formatDateForInput } from '../../../utils/formatting/dateFormat';
import { joinChildBirthPlace, splitChildBirthPlace } from '../../../utils/beneficiary/childBirthPlace';
import { useMothers } from '../../../context/MothersContext';
import PageHeader from '../../../components/ui/PageHeader';
import { notifyAction } from '../../../components/ActionFeedback';
import { navigateBack } from '../../../utils/navigation/navigation';
import { getChildNameErrors } from '../../../utils/beneficiary/childRecordValidation';
import { normalizeFirstName } from '../../../utils/validation/firstNameValidation';
import { useStepNavigation } from '../../../utils/navigation/useStepNavigation';
import { StepNavigationButton, StepNavigationStatus } from '../../../components/ui/StepNavigationButton';

const normalizeChild = (child) => ({
  ...child,
  firstName: child.firstName || child.first_name || '',
  middleName: child.middleName || child.middle_name || '',
  lastName: child.lastName || child.last_name || '',
  birthDocumentName: child.birthDocumentName || child.birth_document_name || '',
  birthDocumentPath: child.birthDocumentPath || child.birth_document_path || '',
  birthDate: formatDateForInput(child.birthDate || child.birth_date),
  birthWeight: child.birthWeight || child.birth_weight || '',
  birthLength: child.birthLength || child.birth_length || '',
  headCircumference: child.headCircumference ?? child.head_circumference ?? '',
  chestCircumference: child.chestCircumference ?? child.chest_circumference ?? '',
  gender: child.gender || 'Male',
  bloodType: child.bloodType || child.blood_type || '',
  noOfChildDelivered: child.noOfChildDelivered || child.no_of_child_delivered || '',
  multipleBirthType: child.multipleBirthType || child.multiple_birth_type || '',
  exclusiveBreastfeeding: child.exclusiveBreastfeeding || child.exclusive_breastfeeding || '',
  expandedNewbornScreening: child.expandedNewbornScreening || child.expanded_newborn_screening || '',
  expandedNewbornScreeningResult: child.expandedNewbornScreeningResult || child.expanded_newborn_screening_result || '',
  deliveryType: child.deliveryType || child.delivery_type || 'Vaginal',
  healthStatus: child.healthStatus || child.health_status || 'Healthy',
  ...splitChildBirthPlace(child.birthPlace || child.birth_place || ''),
  birthAttendant: child.birthAttendant || child.birth_attendant || '',
  apgarScore: child.apgarScore || child.apgar_score || '',
  feedingType: child.feedingType || child.feeding_type || '',
  nutritionNotes: child.nutritionNotes || child.nutrition_notes || '',
  address: child.address || '',
  community: child.community || child.community_name || '',
  batch: child.batch || child.batch_name || '',
  medicalConditions: child.medicalConditions || child.medical_conditions || {},
  medicalRemarks: child.medicalRemarks || child.medical_remarks || '',
  motherId: child.motherId || child.mother_id || '',
  bcgDose1: formatDateForInput(child.BCG?.dose1 || child.BCG?.vaccine_date || child.bcgDose1 || child.bcgDate),
  bcgDose2: formatDateForInput(child.BCG?.dose2 || child.bcgDose2),
  bcgDose3: formatDateForInput(child.BCG?.dose3 || child.bcgDose3),
  bcgRemarks: child.BCG?.remarks || child.bcgRemarks || '',
  hepbDose1: formatDateForInput(child.HepB?.dose1 || child.HepB?.vaccine_date || child.hepbDose1 || child.hepbDate),
  hepbDose2: formatDateForInput(child.HepB?.dose2 || child.hepbDose2),
  hepbDose3: formatDateForInput(child.HepB?.dose3 || child.hepbDose3),
  hepbRemarks: child.HepB?.remarks || child.hepbRemarks || '',
  ipvDose1: formatDateForInput(child.IPV?.dose1 || child.ipvDose1 || child.ipvDate),
  ipvDose2: formatDateForInput(child.IPV?.dose2 || child.ipvDose2),
  ipvDose3: formatDateForInput(child.IPV?.dose3 || child.ipvDose3),
  ipvRemarks: child.IPV?.remarks || child.ipvRemarks || '',
  opvDose1: formatDateForInput(child.OPV?.dose1 || child.OPV?.vaccine_date || child.opvDose1 || child.opvDate),
  opvDose2: formatDateForInput(child.OPV?.dose2 || child.opvDose2),
  opvDose3: formatDateForInput(child.OPV?.dose3 || child.opvDose3),
  opvRemarks: child.OPV?.remarks || child.opvRemarks || '',
  pcvDose1: formatDateForInput(child.PCV?.dose1 || child.pcvDose1 || child.pcvDate),
  pcvDose2: formatDateForInput(child.PCV?.dose2 || child.pcvDose2),
  pcvDose3: formatDateForInput(child.PCV?.dose3 || child.pcvDose3),
  pcvRemarks: child.PCV?.remarks || child.pcvRemarks || '',
  dptDose1: formatDateForInput(child.DPT?.dose1 || child.DPT?.vaccine_date || child.dptDose1 || child.dptDate),
  dptDose2: formatDateForInput(child.DPT?.dose2 || child.dptDose2),
  dptDose3: formatDateForInput(child.DPT?.dose3 || child.dptDose3),
  dptRemarks: child.DPT?.remarks || child.dptRemarks || '',
  mmrDose1: formatDateForInput(child.MMR?.dose1 || child.MMR?.vaccine_date || child.mmrDose1 || child.mmrDate),
  mmrDose2: formatDateForInput(child.MMR?.dose2 || child.mmrDose2),
  mmrDose3: formatDateForInput(child.MMR?.dose3 || child.mmrDose3),
  mmrRemarks: child.MMR?.remarks || child.mmrRemarks || '',
});

const normalizeDatePayload = (value) => String(value || '').trim().replaceAll('/', '-');

export default function EditChildPage() {
  const navigate = useNavigate();
  const { childId } = useParams();
  const location = useLocation();
  const { setMothers } = useMothers();
  const [form, setForm] = useState(() => normalizeChild(location.state?.child || {}));
  const [birthDocumentFile, setBirthDocumentFile] = useState(null);
  const [options, setOptions] = useState({ communities: [], batches: [] });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showNameValidation, setShowNameValidation] = useState(false);
  const { navigationDirection, navigationError, isNavigating, runStepNavigation } = useStepNavigation();
  const EDIT_STEPS = ['general', 'prenatal', 'medical_dental', 'vaccine'];
  const nameErrors = getChildNameErrors(form);

  useEffect(() => {
    getSummary().then((summary) => setOptions({
      communities: summary.communities || [],
      batches: summary.batches || [],
    })).catch((loadError) => console.error('[EditChildPage] Failed to load community options:', loadError));
  }, []);

  useEffect(() => {
    if (!childId) return undefined;

    let active = true;
    apiGetChild(childId)
      .then((response) => {
        if (active && response?.child) setForm(normalizeChild(response.child));
      })
      .catch((loadError) => {
        if (active && !location.state?.child) {
          notifyAction(loadError.message || 'Unable to load child', 'error');
        }
      });

    return () => { active = false; };
  }, [childId]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (activeTab !== 'vaccine') {
      const currentIndex = EDIT_STEPS.indexOf(activeTab);
      setActiveTab(EDIT_STEPS[Math.min(currentIndex + 1, EDIT_STEPS.length - 1)]);
      return;
    }
    const firstMissing = !String(form.firstName ?? '').trim();
    const lastMissing = !String(form.lastName ?? '').trim();
    if (firstMissing || lastMissing || Object.keys(nameErrors).length) {
      setShowNameValidation(true);
      setActiveTab('general');
      notifyAction(
        firstMissing ? 'First name is required.' : lastMissing ? 'Last name is required.' : Object.values(nameErrors)[0],
        'error',
      );
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        firstName: normalizeFirstName(form.firstName),
        multipleBirthType: form.multipleBirthType || null,
        birthPlace: joinChildBirthPlace(form.birthPlaceCity, form.birthPlaceProvince) || null,
        birthDate: normalizeDatePayload(form.birthDate),
        bcgDate: normalizeDatePayload(form.bcgDose1),
        bcgDose1: normalizeDatePayload(form.bcgDose1),
        bcgDose2: normalizeDatePayload(form.bcgDose2),
        bcgDose3: normalizeDatePayload(form.bcgDose3),
        hepbDate: normalizeDatePayload(form.hepbDose1),
        hepbDose1: normalizeDatePayload(form.hepbDose1),
        hepbDose2: normalizeDatePayload(form.hepbDose2),
        hepbDose3: normalizeDatePayload(form.hepbDose3),
        ipvDate: normalizeDatePayload(form.ipvDose1),
        ipvDose1: normalizeDatePayload(form.ipvDose1),
        ipvDose2: normalizeDatePayload(form.ipvDose2),
        ipvDose3: normalizeDatePayload(form.ipvDose3),
        pcvDate: normalizeDatePayload(form.pcvDose1),
        pcvDose1: normalizeDatePayload(form.pcvDose1),
        pcvDose2: normalizeDatePayload(form.pcvDose2),
        pcvDose3: normalizeDatePayload(form.pcvDose3),
        opvDate: normalizeDatePayload(form.opvDose1),
        opvDose1: normalizeDatePayload(form.opvDose1),
        opvDose2: normalizeDatePayload(form.opvDose2),
        opvDose3: normalizeDatePayload(form.opvDose3),
        dptDate: normalizeDatePayload(form.dptDose1),
        dptDose1: normalizeDatePayload(form.dptDose1),
        dptDose2: normalizeDatePayload(form.dptDose2),
        dptDose3: normalizeDatePayload(form.dptDose3),
        mmrDate: normalizeDatePayload(form.mmrDose1),
        mmrDose1: normalizeDatePayload(form.mmrDose1),
        mmrDose2: normalizeDatePayload(form.mmrDose2),
        mmrDose3: normalizeDatePayload(form.mmrDose3),
      };
      const response = await apiUpdateChild(childId || form.id || form.child_code, payload);
      let savedChild = response.child || form;
      let documentUploadFailed = false;
      if (birthDocumentFile) {
        try {
          const documentResponse = await apiUploadChildBirthDocument(childId || form.id || form.child_code, birthDocumentFile);
          savedChild = documentResponse?.child || savedChild;
        } catch (documentError) {
          documentUploadFailed = true;
          console.error('Child details saved but birth document upload failed:', documentError);
        }
      }
      const updatedChild = normalizeChild(savedChild);
      const childKeys = [updatedChild.id, updatedChild.child_code, form.id, form.child_code]
        .filter((key) => key !== undefined && key !== null && key !== '')
        .map(String);

      setMothers((previousMothers) => previousMothers.map((mother) => ({
        ...mother,
        children: Array.isArray(mother.children)
          ? mother.children.map((child) => {
            const childKeysForMatch = [child.id, child.child_code]
              .filter((key) => key !== undefined && key !== null && key !== '')
              .map(String);
            return childKeysForMatch.some((key) => childKeys.includes(key)) ? { ...child, ...updatedChild } : child;
          })
          : mother.children,
      })));

      if (documentUploadFailed) notifyAction('Child details saved, but the birth document upload failed. Edit the child to try again.', 'error');
      const childProfileState = location.state?.returnToState || {};
      navigateBack(navigate, location, `/beneficiary/child/${childId}`, {
        ...childProfileState,
        child: updatedChild,
        updatedChild,
        mother: location.state?.mother || childProfileState.mother,
        returnTo: childProfileState.returnTo
          || (location.state?.mother
            ? `/beneficiary/mother/${location.state.mother.id || location.state.mother.motherId}`
            : '/beneficiary'),
      });
    } catch (saveError) {
      notifyAction(saveError.message || 'Unable to save child', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleNextStep = () => {
    if (activeTab === 'general' && (Object.keys(nameErrors).length || !String(form.firstName ?? '').trim() || !String(form.lastName ?? '').trim())) {
      setShowNameValidation(true);
      notifyAction(
        !String(form.firstName ?? '').trim()
          ? 'First name is required.'
          : !String(form.lastName ?? '').trim()
            ? 'Last name is required.'
            : Object.values(nameErrors)[0],
        'error',
      );
      return false;
    }
    const currentIndex = EDIT_STEPS.indexOf(activeTab);
    if (currentIndex < EDIT_STEPS.length - 1) {
      setActiveTab(EDIT_STEPS[currentIndex + 1]);
    }
    return true;
  };

  const handleBackStep = () => {
    const currentIndex = EDIT_STEPS.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(EDIT_STEPS[currentIndex - 1]);
    }
    return true;
  };

  return (
    <section className="tabs-row create-view">
      <PageHeader
        title="Beneficiaries"
        breadcrumbs={[{ label: 'Beneficiaries', to: '/beneficiary' }, { label: 'Edit Child' }]}
      />

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
                onClick={() => runStepNavigation(() => setActiveTab(step), 'step')}
                disabled={isNavigating || saving}
              >
                <span className="stepper-step-index">{index + 1}</span>
                <span className="stepper-step-label">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="create-form-body">
        <form onSubmit={handleSave}>
          <div className="modal-body-scrollable">
            <ChildFormFields
              activeTab={activeTab}
              form={form}
              setForm={setForm}
              communities={options.communities}
              batches={options.batches}
              birthDocumentFile={birthDocumentFile}
              setBirthDocumentFile={setBirthDocumentFile}
              existingBirthDocumentName={form.birthDocumentName}
              showRequiredValidation={showNameValidation}
              validationErrors={nameErrors}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={() => navigateBack(navigate, location, `/beneficiary/child/${childId}`)} disabled={saving || isNavigating}>Cancel</button>
            {activeTab !== 'general' && (
              <StepNavigationButton
                className="btn-secondary btn-back back-action"
                onClick={() => runStepNavigation(handleBackStep, 'previous')}
                disabled={saving || isNavigating}
                loading={navigationDirection === 'previous'}
                loadingLabel="Please wait..."
              >
                Back
              </StepNavigationButton>
            )}
            {activeTab !== 'vaccine' ? (
              <StepNavigationButton
                className="btn-primary btn-next"
                onClick={() => runStepNavigation(handleNextStep, 'next')}
                disabled={saving || isNavigating}
                loading={navigationDirection === 'next'}
              >
                Next
              </StepNavigationButton>
            ) : (
              <button type="submit" className="btn-create-action" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            )}
            <StepNavigationStatus direction={navigationDirection} error={navigationError} />
          </div>
        </form>
      </div>
    </section>
  );
}