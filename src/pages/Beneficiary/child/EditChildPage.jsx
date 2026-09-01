import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChildFormFields } from './BeneficiaryChild';
import { apiGetChild, apiUpdateChild } from '../../../api/children';
import { getSummary } from '../../Community/communityService';
import { formatDateForInput } from '../../../utils/dateFormat';
import { useMothers } from '../../../context/MothersContext';

const normalizeChild = (child) => ({
  ...child,
  firstName: child.firstName || child.first_name || '',
  middleName: child.middleName || child.middle_name || '',
  lastName: child.lastName || child.last_name || '',
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
  fatherName: child.fatherName || child.father_name || '',
  relationship: child.relationship || '',
  address: child.address || '',
  community: child.community || child.community_name || '',
  batch: child.batch || child.batch_name || '',
  medicalConditions: child.medicalConditions || child.medical_conditions || {},
  medicalRemarks: child.medicalRemarks || child.medical_remarks || '',
  motherId: child.motherId || child.mother_id || '',
  bcgDate: formatDateForInput(child.BCG?.vaccine_date || child.bcgDate),
  bcgRemarks: child.BCG?.remarks || child.bcgRemarks || '',
  hepbDate: formatDateForInput(child.HepB?.vaccine_date || child.hepbDate),
  hepbRemarks: child.HepB?.remarks || child.hepbRemarks || '',
  opvDate: formatDateForInput(child.OPV?.vaccine_date || child.opvDate),
  opvRemarks: child.OPV?.remarks || child.opvRemarks || '',
  dptDate: formatDateForInput(child.DPT?.vaccine_date || child.dptDate),
  dptRemarks: child.DPT?.remarks || child.dptRemarks || '',
  mmrDate: formatDateForInput(child.MMR?.vaccine_date || child.mmrDate),
  mmrRemarks: child.MMR?.remarks || child.mmrRemarks || '',
});

const normalizeDatePayload = (value) => String(value || '').trim().replaceAll('/', '-');

export default function EditChildPage() {
  const navigate = useNavigate();
  const { childId } = useParams();
  const location = useLocation();
  const { setMothers } = useMothers();
  const [form, setForm] = useState(() => normalizeChild(location.state?.child || {}));
  const [options, setOptions] = useState({ communities: [], batches: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

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
        if (active && !location.state?.child) setError(loadError.message || 'Unable to load child');
      });

    return () => { active = false; };
  }, [childId]);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        multipleBirthType: form.multipleBirthType || null,
        birthDate: normalizeDatePayload(form.birthDate),
        bcgDate: normalizeDatePayload(form.bcgDate),
        hepbDate: normalizeDatePayload(form.hepbDate),
        opvDate: normalizeDatePayload(form.opvDate),
        dptDate: normalizeDatePayload(form.dptDate),
        mmrDate: normalizeDatePayload(form.mmrDate),
      };
      const response = await apiUpdateChild(childId || form.id || form.child_code, payload);
      const updatedChild = normalizeChild(response.child || form);
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

      navigate(-1, { state: { updatedChild } });
    } catch (saveError) {
      setError(saveError.message || 'Unable to save child');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="edit-mother-page">
      <header className="edit-mother-header">
        <h1 className="edit-mother-title">Edit: {form.firstName} {form.lastName}</h1>
      </header>
      {error && <div className="form-error" style={{ color: 'var(--danger-color)', margin: '8px 0' }}>{error}</div>}
      <form onSubmit={handleSave} className="mother-edit-form">
        {['general', 'prenatal', 'medical_dental', 'vaccine'].map((section) => (
          <ChildFormFields
            key={section}
            activeTab={section}
            form={form}
            setForm={setForm}
            communities={options.communities}
            batches={options.batches}
          />
        ))}
        <div className="modal-footer edit-mother-footer">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </section>
  );
}