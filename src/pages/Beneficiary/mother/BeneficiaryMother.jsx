import React from 'react';
import { formatDateForInput } from '../../../utils/dateFormat';

export function MotherFormFields({
  activeTab,
  form,
  setForm,
  communities = [],
  groups = [],
  batches = [],
  autoCalculate = true,
  readOnly = false,
}) {
  const uniqueCommunities = Array.from(new Set(communities.map((comm) => comm.name))).filter(Boolean);
  const selectedGroups = groups.filter((group) => !form.community || group.community === form.community);
  const selectedBatches = batches.filter((batch) => !form.community || !batch.community || batch.community === form.community);

  const handleLmpChange = (val) => {
    setForm((prev) => {
      const newForm = { ...prev, lmpDate: val };
      if (val && autoCalculate) {
        const lmp = new Date(val);
        if (!isNaN(lmp.getTime())) {
          const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
          newForm.eddDate = edd.toISOString().split('T')[0];

          // Calculate Gestational Age (GA) in weeks
          const today = new Date();
          const diffTime = today - lmp;
          const diffWeeks = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7)));
          newForm.gestationalAge = String(diffWeeks);

          // Determine Trimester
          if (diffWeeks <= 12) {
            newForm.trimester = '1st Trimester';
          } else if (diffWeeks <= 26) {
            newForm.trimester = '2nd Trimester';
          } else {
            newForm.trimester = '3rd Trimester';
          }
        }
      }
      return newForm;
    });
  };

  const handleObHistoryChange = (index, field, value) => {
    setForm((prev) => {
      const updatedHistory = [...(prev.obHistory || [])];
      updatedHistory[index] = { ...updatedHistory[index], [field]: value };
      return { ...prev, obHistory: updatedHistory };
    });
  };

  const handleCheckboxChange = (section, field, checked) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [field]: checked,
      },
    }));
  };

  // Helpers to reduce repetitive form markup and support read-only display
  const renderField = ({ id, label, name, type = 'text', placeholder = '', required = false }) => {
    const value = form[name] ?? '';
    const isDate = type === 'date';
    if (readOnly) {
      return (
        <div className="form-group">
          <label className="form-label">{label}</label>
          <div className="form-readonly-value">{value}</div>
        </div>
      );
    }

    return (
      <div className="form-group">
        <label className="form-label" htmlFor={id}>{label}</label>
        <input
          id={id}
          type={isDate ? 'text' : type}
          className="form-input"
          placeholder={isDate ? 'yyyy/mm/dd' : placeholder}
          value={isDate ? formatDateForInput(value).replaceAll('-', '/') : value}
          onChange={(e) => setForm((prev) => ({
            ...prev,
            [name]: isDate ? e.target.value.replace(/[^0-9/]/g, '').replaceAll('/', '-').replace(/^(\d{4})-(\d{2})-(\d{2}).*$/, '$1-$2-$3') : e.target.value,
          }))}
          required={required}
        />
      </div>
    );
  };

  const renderSelect = ({ id, label, name, options = [], placeholder = '', required = false }) => {
    const value = form[name] ?? '';
    if (readOnly) {
      return (
        <div className="form-group">
          <label className="form-label">{label}</label>
          <div className="form-readonly-value">{value}</div>
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
          onChange={(e) => setForm((prev) => name === 'community'
            ? { ...prev, community: e.target.value, groupId: '', batchId: '', group: '', batch: '' }
            : { ...prev, [name]: e.target.value })}
          required={required}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value ?? opt} value={opt.value ?? opt}>{opt.label ?? opt}</option>
          ))}
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
          <div className="form-readonly-value">{value}</div>
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
        <h4 className="form-section-title">I.A Mother's Information</h4>
        <div className="form-row-4 full-width name-row">
          {renderField({ id: 'mother-first-name', label: "First Name", name: 'firstName', placeholder: 'First name', required: true })}
          {renderField({ id: 'mother-middle-name', label: "Middle Name", name: 'middleName', placeholder: 'Middle name' })}
          {renderField({ id: 'mother-last-name', label: "Last Name", name: 'lastName', placeholder: 'Last name', required: true })}
          {renderField({ id: 'mother-suffix', label: "Suffix", name: 'suffix', placeholder: 'Suffix' })}
        </div>

        <div className="form-row-3 full-width">
          {renderField({ id: 'mother-id', label: "Mother ID", name: 'motherId', placeholder: "Enter mother's ID" })}
          {renderField({ id: 'mother-dob', label: "Date of Birth", name: 'dob', type: 'date', required: true })}
          {renderField({ id: 'mother-contact', label: "Contact Number", name: 'contactNumber', type: 'tel', placeholder: '0917******' })}
        </div>

        <div className="form-row-4 full-width">
          {readOnly ? (
            renderField({ id: 'mother-lmp', label: 'Date of LMP', name: 'lmpDate', type: 'date' })
          ) : (
            <div className="form-group">
              <label className="form-label" htmlFor="mother-lmp">Date of LMP</label>
              <input
                id="mother-lmp"
                type="text"
                className="form-input"
                placeholder="yyyy/mm/dd"
                value={formatDateForInput(form.lmpDate).replaceAll('-', '/')}
                onChange={(e) => handleLmpChange(e.target.value.replace(/[^0-9/]/g, '').replaceAll('/', '-').replace(/^(\d{4})-(\d{2})-(\d{2}).*$/, '$1-$2-$3'))}
              />
            </div>
          )}

          {renderField({ id: 'mother-edd', label: "Expected Delivery Date (EDD)", name: 'eddDate', type: 'date' })}
          {renderField({ id: 'mother-weight', label: "Mother's Weight (kg)", name: 'weight', placeholder: 'e.g. 50 kg' })}
          {renderField({ id: 'mother-height', label: "Mother's Height (cm)", name: 'height', placeholder: 'e.g. 150 cm' })}
        </div>

        <div className="form-row-3 full-width">
          {renderSelect({ id: 'mother-high-risk', label: 'Is High Risk?', name: 'isHighRisk', options: [{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }] })}
          {renderSelect({ id: 'mother-program', label: 'Program Type', name: 'programType', options: [
            { value: 'Maternal Health Program', label: 'Maternal Health Program' },
            { value: 'High Risk Maternal Support', label: 'High Risk Maternal Support' },
            { value: 'New Mother Care', label: 'New Mother Care' },
          ] })}
          {renderSelect({ id: 'mother-area', label: 'Area', name: 'area', options: [
            'Poblacion','Upland','Downtown','Coastal','Highland','Lowland','Riverside','Forest'
          ] })}
        </div>

        {renderSelect({
          id: 'mother-community',
          label: 'School',
          name: 'community',
          options: uniqueCommunities,
          placeholder: 'Select school',
          required: true,
        })}
        {renderSelect({
          id: 'mother-group',
          label: 'Group',
          name: 'groupId',
          options: selectedGroups.map((group) => ({ value: group.id, label: group.name })),
          placeholder: 'Select group',
        })}
        {renderSelect({
          id: 'mother-batch',
          label: 'Batch',
          name: 'batchId',
          options: selectedBatches.map((batch) => ({ value: batch.databaseId ?? batch.id, label: batch.name })),
          placeholder: 'Select batch',
        })}

        <h4 className="form-section-title">I.B EMERGENCY CONTACT DETAILS</h4>
        <div className="form-row-3 full-width">
          {renderField({ id: 'emergency-name', label: 'Name', name: 'emergencyName', placeholder: 'Enter contact name' })}
          {renderField({ id: 'emergency-contact', label: 'Contact Number', name: 'emergencyContact', type: 'tel', placeholder: 'Enter contact number' })}
          {renderField({ id: 'emergency-relationship', label: 'Relationship', name: 'emergencyRelationship', placeholder: 'e.g. husband' })}
        </div>

        <h4 className="form-section-title">I.C OTHER DETAILS</h4>
        <div className="form-group full-width">
          {renderField({ id: 'spouse-name', label: 'Spouse Name', name: 'spouseName', placeholder: 'Enter spouse name' })}
        </div>
        {renderTextarea({ id: 'mother-address', label: 'Address', name: 'address', rows: 3, placeholder: 'Enter address...' })}
      </>
    );
  }

  if (activeTab === 'prenatal') {
    return (
      <>
        <h4 className="form-section-title">II. INITIAL PRENATAL ASSESSMENT & MATERNAL HEALTH PROFILE</h4>
        <div className="form-row-3 full-width">
          {renderField({ id: 'prenatal-reg-date', label: 'Date of Prenatal Registration', name: 'prenatalRegDate', type: 'date' })}
          {renderSelect({ id: 'prenatal-trimester', label: 'Trimester at Registration', name: 'trimester', options: ['1st Trimester','2nd Trimester','3rd Trimester'] })}
          {renderField({ id: 'prenatal-gest-age', label: 'Gestational Age at Reg (weeks)', name: 'gestationalAge', placeholder: 'e.g. 12' })}
        </div>

        <div className="form-row-3 full-width">
          {renderField({ id: 'prenatal-weight', label: 'Weight (kg) at Reg', name: 'prenatalWeight', placeholder: 'e.g. 52' })}
          {renderField({ id: 'prenatal-bp', label: 'Blood Pressure (BP) at Reg', name: 'prenatalBp', placeholder: 'e.g. 120/80' })}
          {renderField({ id: 'prenatal-height', label: 'Height (cm) at Reg', name: 'prenatalHeight', placeholder: 'e.g. 150' })}
        </div>

        <div className="form-row-3 full-width">
          {renderField({ id: 'prenatal-fundal', label: 'Fundal Height (cm) at Reg', name: 'fundalHeight', placeholder: 'e.g. 15' })}
          {renderField({ id: 'prenatal-fhr', label: 'FHR (bpm) at Reg', name: 'fhr', placeholder: 'e.g. 145' })}
          <div className="form-group" aria-hidden="true" />
        </div>

        <h4 className="form-section-title">III. NUMBER OF PREGNANCIES & BIRTHS (OB)</h4>
        <div className="form-row-4 full-width">
          {renderField({ id: 'ob-gravida', label: 'Gravida (Pregnancies)', name: 'gravida', type: 'number', placeholder: 'Total pregnancies' })}
          {renderField({ id: 'ob-para', label: 'Para (Completed >20wks)', name: 'para', type: 'number', placeholder: 'Completed pregnancies' })}
          {renderField({ id: 'ob-abortion', label: 'Abortion', name: 'abortion', type: 'number', placeholder: 'Spontaneous/induced' })}
          {renderField({ id: 'ob-stillbirth', label: 'Stillbirth', name: 'stillbirth', type: 'number', placeholder: 'Fetal death >20wks' })}
        </div>

        <div className="form-group full-width">
          <label className="form-label">OB History Table</label>
          <div className="ob-history-form-table-wrapper">
            <table className="ob-history-form-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Event</th>
                  <th style={{ width: '35%' }}>Gestational Age (weeks)</th>
                  <th style={{ width: '50%' }}>Outcomes / Complications</th>
                </tr>
              </thead>
              <tbody>
                {(form.obHistory || []).map((row, index) => (
                  <tr key={index}>
                    <td><strong>{row.event}</strong></td>
                    <td>
                      {readOnly ? (
                        <div className="form-readonly-value">{row.gestationalAge || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          className="form-input table-input"
                          placeholder="e.g. 38 weeks"
                          value={row.gestationalAge || ''}
                          onChange={(e) => handleObHistoryChange(index, 'gestationalAge', e.target.value)}
                        />
                      )}
                    </td>
                    <td>
                      {readOnly ? (
                        <div className="form-readonly-value">{row.outcome || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          className="form-input table-input"
                          placeholder="e.g. Normal Vaginal Delivery"
                          value={row.outcome || ''}
                          onChange={(e) => handleObHistoryChange(index, 'outcome', e.target.value)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  if (activeTab === 'medical_dental') {
    const conditionsKeys = [
      { key: 'hypertension', label: 'Hypertension' },
      { key: 'diabetes', label: 'Diabetes' },
      { key: 'asthma', label: 'Asthma' },
      { key: 'heartDisease', label: 'Heart Disease' },
      { key: 'kidneyDisease', label: 'Kidney Disease' },
      { key: 'epilepsy', label: 'Epilepsy' },
      { key: 'goiter', label: 'Goiter' },
      { key: 'tuberculosis', label: 'Tuberculosis' },
      { key: 'cancer', label: 'Cancer' },
      { key: 'std', label: 'Sexually Transmitted Diseases' },
      { key: 'multiplePregnancy', label: 'Multiple Pregnancy (e.g. twins)' },
      { key: 'prevCesarean', label: 'Previous Caesarean Section' },
    ];

    const dentalWorkKeys = [
      { key: 'tartarRemoval', label: 'Tartar Removal' },
      { key: 'filling', label: 'Filling' },
      { key: 'cleaning', label: 'Cleaning' },
      { key: 'extraction', label: 'Extraction' },
      { key: 'rootCanal', label: 'Root Canal' },
      { key: 'other', label: 'Other' },
    ];

    return (
      <>
        <h4 className="form-section-title">IV.A HISTORY OF MEDICAL CONDITIONS</h4>
        <div className="form-checkboxes-grid full-width">
          {readOnly ? (
            <div className="form-readonly-list">
              {(conditionsKeys.filter(({ key }) => !!form.medicalConditions?.[key]).map(c => c.label)).length > 0 ? (
                conditionsKeys.filter(({ key }) => !!form.medicalConditions?.[key]).map(({ key, label }) => (
                  <span key={key} className="readonly-badge">{label}</span>
                ))
              ) : (
                <div className="form-readonly-value">None</div>
              )}
            </div>
          ) : (
            conditionsKeys.map(({ key, label }) => (
              <label key={key} className="form-checkbox-label">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={!!form.medicalConditions?.[key]}
                  onChange={(e) => handleCheckboxChange('medicalConditions', key, e.target.checked)}
                />
                <span>{label}</span>
              </label>
            ))
          )}
        </div>
        {renderTextarea({ id: 'other-medical-notes', label: 'Other Medical History', name: 'otherMedicalHistory', rows: 2, placeholder: 'Other medical history notes...' })}

        <h4 className="form-section-title">IV.B DENTAL HEALTH CONDITION</h4>
        <div className="form-row-3 full-width">
          {renderField({ id: 'dental-date', label: 'Date of Dental Check-up', name: 'dentalCheckupDate', type: 'date' })}
          {renderField({ id: 'dental-facility', label: 'Dental Clinic / Health Facility', name: 'dentalFacility', placeholder: 'Facility name' })}
          {renderField({ id: 'dentist-charge', label: 'Dentist in Charge', name: 'dentistInCharge', placeholder: 'Dentist name' })}
        </div>

        <div className="form-row-3 full-width">
          {renderField({ id: 'dentist-comm', label: 'Community Dentist Name', name: 'communityDentist', placeholder: 'Community dentist' })}
          {renderField({ id: 'dentist-license', label: 'Dentist License No', name: 'dentistLicense', placeholder: 'License number' })}
          {renderField({ id: 'dentist-contact', label: 'Dentist Contact No', name: 'dentistContact', type: 'tel', placeholder: 'Contact number' })}
        </div>

        {renderField({ id: 'teeth-count', label: 'Number of Teeth Pregnant', name: 'teethCount', type: 'number', placeholder: 'e.g. 28' })}

        {renderTextarea({ id: 'dental-findings', label: 'Dental Findings / Diagnosis', name: 'dentalFindings', rows: 2, placeholder: 'Findings or diagnosis...' })}

        <div className="form-group full-width">
          <label className="form-label">Dental Work Done</label>
          {readOnly ? (
            <div className="form-readonly-list">
              {(dentalWorkKeys.filter(({ key }) => !!form.dentalWork?.[key]).map(d => d.label)).length > 0 ? (
                dentalWorkKeys.filter(({ key }) => !!form.dentalWork?.[key]).map(({ key, label }) => (
                  <span key={key} className="readonly-badge">{label}</span>
                ))
              ) : (
                <div className="form-readonly-value">None</div>
              )}
            </div>
          ) : (
            <div className="form-checkboxes-grid dental-grid">
              {dentalWorkKeys.map(({ key, label }) => (
                <label key={key} className="form-checkbox-label">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={!!form.dentalWork?.[key]}
                    onChange={(e) => handleCheckboxChange('dentalWork', key, e.target.checked)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {renderTextarea({ id: 'dental-remarks', label: 'Remarks / Recommendations', name: 'dentalRemarks', rows: 2, placeholder: 'Dental recommendations...' })}
      </>
    );
  }

  if (activeTab === 'vaccine') {
    return (
      <>
        <h4 className="form-section-title">IV.C VACCINE RECORD</h4>
        <div className="form-group full-width">
          <div className="vaccine-form-table-wrapper">
            <table className="vaccine-form-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Vaccine</th>
                  <th style={{ width: '35%' }}>Date Given</th>
                  <th style={{ width: '40%' }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((num) => (
                  <tr key={num}>
                    <td><strong>Tetanus Toxoid {num} (TT{num})</strong></td>
                    <td>
                      {readOnly ? (
                        <div className="form-readonly-value">{form[`tt${num}Date`] || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          className="form-input table-input"
                          placeholder="yyyy/mm/dd"
                          value={formatDateForInput(form[`tt${num}Date`] || '').replaceAll('-', '/')}
                          onChange={(e) => setForm((prev) => ({
                            ...prev,
                            [`tt${num}Date`]: e.target.value.replace(/[^0-9/]/g, '').replaceAll('/', '-').replace(/^(\d{4})-(\d{2})-(\d{2}).*$/, '$1-$2-$3'),
                          }))}
                        />
                      )}
                    </td>
                    <td>
                      {readOnly ? (
                        <div className="form-readonly-value">{form[`tt${num}Remarks`] || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          className="form-input table-input"
                          placeholder="Remarks..."
                          value={form[`tt${num}Remarks`] || ''}
                          onChange={(e) => setForm((prev) => ({ ...prev, [`tt${num}Remarks`]: e.target.value }))}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  return null;
}
