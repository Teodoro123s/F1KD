import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChildFormFields } from './BeneficiaryChild';
import { apiGetChild, apiUpdateChild, apiUploadChildBirthDocument } from '../../../api/children';
import { getSummary } from '../../Community/communityService';
import { formatDateForInput } from '../../../utils/dateFormat';
import { useMothers } from '../../../context/MothersContext';
import PageHeader from '../../../components/ui/PageHeader';
import { notifyAction } from '../../../components/ActionFeedback';

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
  gender: child.gender || 'Male',
  bloodType: child.bloodType || child.blood_type || '',
  noOfChildDelivered: child.noOfChildDelivered || child.no_of_child_delivered || '',
  multipleBirthType: child.multipleBirthType || child.multiple_birth_type || '',
  exclusiveBreastfeeding: child.exclusiveBreastfeeding || child.exclusive_breastfeeding || '',
  expandedNewbornScreening: child.expandedNewbornScreening || child.expanded_newborn_screening || '',
  expandedNewbornScreeningResult: child.expandedNewbornScreeningResult || child.expanded_newborn_screening_result || '',
  deliveryType: child.deliveryType || child.delivery_type || 'Vaginal',
  healthStatus: child.healthStatus || child.health_status || 'Healthy',
  birthPlace: child.birthPlace || child.birth_place || '',
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
  opvDose1: formatDateForInput(child.OPV?.dose1 || child.OPV?.vaccine_date || child.opvDose1 || child.opvDate),
  opvDose2: formatDateForInput(child.OPV?.dose2 || child.opvDose2),
  opvDose3: formatDateForInput(child.OPV?.dose3 || child.opvDose3),
  opvRemarks: child.OPV?.remarks || child.opvRemarks || '',
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
  const EDIT_STEPS = ['general', 'prenatal', 'medical_dental', 'vaccine'];

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
    setSaving(true);
    try {
      const payload = {
        ...form,
        multipleBirthType: form.multipleBirthType || null,
        birthDate: normalizeDatePayload(form.birthDate),
        bcgDate: normalizeDatePayload(form.bcgDose1),
        bcgDose1: normalizeDatePayload(form.bcgDose1),
        bcgDose2: normalizeDatePayload(form.bcgDose2),
        bcgDose3: normalizeDatePayload(form.bcgDose3),
        hepbDate: normalizeDatePayload(form.hepbDose1),
        hepbDose1: normalizeDatePayload(form.hepbDose1),
        hepbDose2: normalizeDatePayload(form.hepbDose2),
        hepbDose3: normalizeDatePayload(form.hepbDose3),
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
      navigate(-1, { state: { updatedChild } });
    } catch (saveError) {
      notifyAction(saveError.message || 'Unable to save child', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleNextStep = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const currentIndex = EDIT_STEPS.indexOf(activeTab);
    if (currentIndex < EDIT_STEPS.length - 1) {
      setActiveTab(EDIT_STEPS[currentIndex + 1]);
    }
  };

  const handleBackStep = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const currentIndex = EDIT_STEPS.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(EDIT_STEPS[currentIndex - 1]);
    }
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
                onClick={() => setActiveTab(step)}
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
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={() => navigate(-1)} disabled={saving}>Cancel</button>
            {activeTab !== 'general' && (
              <button type="button" className="btn-secondary btn-back back-action" onClick={handleBackStep} disabled={saving}>Back</button>
            )}
            {activeTab !== 'vaccine' ? (
              <button type="button" className="btn-primary btn-next" onClick={handleNextStep} disabled={saving}>Next</button>
            ) : (
              <button type="submit" className="btn-create-action" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}