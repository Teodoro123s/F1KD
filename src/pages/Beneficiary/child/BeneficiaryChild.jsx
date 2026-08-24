import React from 'react';
import { formatDateForInput } from '../../../utils/dateFormat';

export function ChildFormFields({ activeTab, form, setForm, communities = [], batches = [], readOnly = false }) {
  const uniqueCommunities = Array.from(new Set(communities.map((comm) => comm.name))).filter(Boolean);
  const uniqueBatches = Array.from(new Set((batches || []).map((batch) => batch.name))).filter(Boolean);

  const handleCheckboxChange = (section, field, checked) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [field]: checked,
      },
    }));
  };

  const renderField = ({ id, label, name, type = 'text', placeholder = '', required = false, min, step }) => {
    const value = form[name] ?? '';
    const isDate = type === 'date';

    if (readOnly) {
      return (
        <div className="form-group">
          <label className="form-label">{label}</label>
          <div className="form-readonly-value">{value || '-'}</div>
        </div>
      );
    }

    return (
      <div className="form-group">
        <label className="form-label" htmlFor={id}>{label}</label>
        <input
          id={id}
          type={isDate ? 'text' : type}
          inputMode={isDate ? 'numeric' : undefined}
          pattern={isDate ? '\\d{4}/\\d{2}/\\d{2}' : undefined}
          className="form-input"
          placeholder={isDate ? 'yyyy/mm/dd' : placeholder}
          value={isDate ? formatDateForInput(value).replaceAll('-', '/') : value}
          min={min}
          step={step}
          onChange={(e) => setForm((prev) => ({
            ...prev,
            [name]: isDate ? e.target.value.replace(/[^0-9/]/g, '').replaceAll('/', '-').replace(/^(\d{4})-(\d{2})-(\d{2}).*$/, '$1-$2-$3') : e.target.value,
          }))}
          required={required}
        />
      </div>
    );
  };

  const renderSelect = ({ id, label, name, options = [], placeholder = '' }) => {
    const value = form[name] ?? '';

    if (readOnly) {
      return (
        <div className="form-group">
          <label className="form-label">{label}</label>
          <div className="form-readonly-value">{value || '-'}</div>
        </div>
      );
    }

    return (
      <div className="form-group">
        <label className="form-label" htmlFor={id}>{label}</label>
        <select
          id={id}
          className="form-select"
          value={value}
          onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => {
            const optionValue = option.value ?? option;
            const optionLabel = option.label ?? option;
            return (
              <option key={optionValue} value={optionValue}>
                {optionLabel}
              </option>
            );
          })}
        </select>
      </div>
    );
  };

  const renderTextarea = ({ id, label, name, rows = 2, placeholder = '' }) => {
    const value = form[name] ?? '';

    if (readOnly) {
      return (
        <div className="form-group full-width">
          <label className="form-label">{label}</label>
          <div className="form-readonly-value">{value || '-'}</div>
        </div>
      );
    }

    return (
      <div className="form-group full-width">
        <label className="form-label" htmlFor={id}>{label}</label>
        <textarea
          id={id}
          className="form-input"
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))}
        />
      </div>
    );
  };

  if (activeTab === 'general') {
    return (
      <>
        <h4 className="form-section-title">Child Information</h4>
        <div className="form-row-4 full-width name-row">
          {renderField({ id: 'child-first-name', label: 'First Name', name: 'firstName', placeholder: 'First name', required: true })}
          {renderField({ id: 'child-middle-name', label: 'Middle Name', name: 'middleName', placeholder: 'Middle name' })}
          {renderField({ id: 'child-last-name', label: 'Last Name', name: 'lastName', placeholder: 'Last name', required: true })}
          {renderField({ id: 'child-suffix', label: 'Suffix', name: 'suffix', placeholder: 'Suffix' })}
        </div>

        <div className="form-row-4 full-width">
          {renderField({ id: 'child-birth-date', label: 'Birth Date', name: 'birthDate', type: 'date' })}
          {renderField({ id: 'child-birth-weight', label: 'Birth Weight (kg)', name: 'birthWeight', placeholder: 'e.g. 3.2' })}
          {renderField({ id: 'child-birth-length', label: 'Birth Length (cm)', name: 'birthLength', placeholder: 'e.g. 49' })}
          {renderSelect({
            id: 'child-gender',
            label: 'Gender',
            name: 'gender',
            options: [{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }],
          })}
        </div>

        <div className="form-row-4 full-width">
          {renderSelect({
            id: 'child-blood-type',
            label: 'Blood Type',
            name: 'bloodType',
            options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
            placeholder: 'Select blood type',
          })}
          {renderField({ id: 'child-children-delivered', label: 'No. Old Child Delivered', name: 'noOfChildDelivered', type: 'number', min: 0, step: 1, placeholder: 'e.g. 1' })}
          {renderSelect({
            id: 'child-exclusive-breastfeeding',
            label: 'Exclusive Breastfeeding',
            name: 'exclusiveBreastfeeding',
            options: ['Yes', 'No', 'Unknown'],
            placeholder: 'Select option',
          })}
        </div>

        <div className="form-row-4 full-width">
          {renderSelect({
            id: 'child-delivery-type',
            label: 'Delivery Type',
            name: 'deliveryType',
            options: [{ value: 'Vaginal', label: 'Vaginal' }, { value: 'Cesarean', label: 'Cesarean' }],
          })}
          {renderSelect({
            id: 'child-health-status',
            label: 'Health Status',
            name: 'healthStatus',
            options: [{ value: 'Healthy', label: 'Healthy' }, { value: 'Needs Follow-up', label: 'Needs Follow-up' }, { value: 'Critical', label: 'Critical' }],
          })}
          {renderSelect({
            id: 'child-community',
            label: 'Community',
            name: 'community',
            options: uniqueCommunities.map((name) => ({ value: name, label: name })),
            placeholder: 'Select community',
          })}
          {renderSelect({
            id: 'child-batch',
            label: 'Batch',
            name: 'batch',
            options: uniqueBatches.map((name) => ({ value: name, label: name })),
            placeholder: 'Select batch',
          })}
        </div>

        <div className="form-row-4 full-width">
          {renderField({ id: 'child-father-name', label: 'Father Name', name: 'fatherName', placeholder: 'Father / Parent name' })}
          {renderField({ id: 'child-relationship', label: 'Relationship', name: 'relationship', placeholder: 'Relationship to mother' })}
          {renderField({ id: 'child-address', label: 'Address', name: 'address', placeholder: 'Current address' })}
          {renderSelect({
            id: 'child-status',
            label: 'Status',
            name: 'status',
            options: [{ value: 'Active', label: 'Active' }, { value: 'Pending', label: 'Pending' }, { value: 'Completed', label: 'Completed' }],
          })}
        </div>

        <div className="form-row-3 full-width">
          {renderField({ id: 'child-birth-attendant', label: 'Birth Attendant', name: 'birthAttendant', placeholder: 'Midwife / Doctor' })}
          {renderField({ id: 'child-apgar', label: 'Apgar Score', name: 'apgarScore', placeholder: 'e.g. 8/10' })}
          {renderField({ id: 'child-feeding', label: 'Feeding Type', name: 'feedingType', placeholder: 'Exclusive Breastfeeding' })}
        </div>

        {renderTextarea({ id: 'child-nutrition-notes', label: 'Nutrition Notes', name: 'nutritionNotes', rows: 3, placeholder: 'Nutrition or feeding notes...' })}
        {renderTextarea({ id: 'child-newborn-screening', label: 'Expanded Newborn Screening', name: 'expandedNewbornScreening', rows: 3, placeholder: 'Screening details...' })}
        {renderTextarea({ id: 'child-newborn-screening-result', label: 'Expanded Newborn Screening Result', name: 'expandedNewbornScreeningResult', rows: 3, placeholder: 'Screening result...' })}
      </>
    );
  }

  if (activeTab === 'prenatal') {
    return (
      <>
        <h4 className="form-section-title">Prenatal / Birth Summary</h4>
        {renderTextarea({ id: 'child-prenatal-notes', label: 'Prenatal Notes', name: 'prenatalNotes', rows: 3, placeholder: 'Any prenatal or birth related notes...' })}
      </>
    );
  }

  if (activeTab === 'medical_dental') {
    const conditionsKeys = [
      { key: 'congenitalHeartDisease', label: 'Congenital Heart Disease' },
      { key: 'respiratoryIssues', label: 'Respiratory Issues' },
      { key: 'prematurity', label: 'Prematurity' },
      { key: 'jaundice', label: 'Jaundice' },
      { key: 'anemia', label: 'Anemia' },
      { key: 'growthDelay', label: 'Growth Delay' },
    ];

    return (
      <>
        <h4 className="form-section-title">Medical Conditions</h4>
        <div className="form-checkboxes-grid full-width">
          {conditionsKeys.map(({ key, label }) => (
            <label key={key} className="form-checkbox-label">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={!!form.medicalConditions?.[key]}
                onChange={(e) => handleCheckboxChange('medicalConditions', key, e.target.checked)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {renderTextarea({ id: 'child-medical-remarks', label: 'Medical Remarks', name: 'medicalRemarks', rows: 3, placeholder: 'Medical observations or remarks...' })}
      </>
    );
  }

  if (activeTab === 'vaccine') {
    return (
      <>
        <h4 className="form-section-title">Vaccination Record</h4>
        <div className="form-row-4 full-width">
          {renderField({ id: 'child-bcg-date', label: 'BCG Date', name: 'bcgDate', type: 'date' })}
          {renderField({ id: 'child-bcg-remarks', label: 'BCG Remarks', name: 'bcgRemarks', placeholder: 'Remarks' })}
          {renderField({ id: 'child-hepb-date', label: 'HepB Date', name: 'hepbDate', type: 'date' })}
          {renderField({ id: 'child-hepb-remarks', label: 'HepB Remarks', name: 'hepbRemarks', placeholder: 'Remarks' })}
        </div>
        <div className="form-row-4 full-width">
          {renderField({ id: 'child-opv-date', label: 'OPV Date', name: 'opvDate', type: 'date' })}
          {renderField({ id: 'child-opv-remarks', label: 'OPV Remarks', name: 'opvRemarks', placeholder: 'Remarks' })}
          {renderField({ id: 'child-dpt-date', label: 'DPT Date', name: 'dptDate', type: 'date' })}
          {renderField({ id: 'child-dpt-remarks', label: 'DPT Remarks', name: 'dptRemarks', placeholder: 'Remarks' })}
        </div>
        <div className="form-row-2 full-width">
          {renderField({ id: 'child-mmr-date', label: 'MMR Date', name: 'mmrDate', type: 'date' })}
          {renderField({ id: 'child-mmr-remarks', label: 'MMR Remarks', name: 'mmrRemarks', placeholder: 'Remarks' })}
        </div>
      </>
    );
  }

  return null;
}
