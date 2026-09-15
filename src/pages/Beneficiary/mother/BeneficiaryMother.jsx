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
  slashDateInput = false,
}) {
  const [dateDrafts, setDateDrafts] = React.useState({});
  const datePickerRefs = React.useRef({});
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

  const formatSlashDate = (value) => {
    const normalized = formatDateForInput(value);
    return normalized ? normalized.replaceAll('-', '/') : String(value || '').replaceAll('-', '/');
  };

  const formatPartialSlashDate = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length < 4) return digits;
    if (digits.length === 4) return `${digits}/`;
    if (digits.length <= 6) return `${digits.slice(0, 4)}/${digits.slice(4)}`;
    return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6)}`;
  };

  const normalizeSlashDate = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length < 4) return '';
    const year = digits.slice(0, 4);
    const month = digits.slice(4, 6).padStart(2, '0');
    const day = digits.slice(6, 8).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateDisplayValue = (name, value) => dateDrafts[name] ?? (slashDateInput ? formatSlashDate(value) : formatDateForInput(value));

  const updateDateValue = (name, value, onChange) => {
    const draft = slashDateInput ? formatPartialSlashDate(value) : value;
    setDateDrafts((prev) => ({ ...prev, [name]: draft }));
    const normalized = slashDateInput ? normalizeSlashDate(draft) : draft;
    if (draft.replace(/\D/g, '').length === 8 && /^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      if (onChange) onChange(normalized);
      else setForm((prev) => ({ ...prev, [name]: normalized }));
    }
  };

  const commitDateValue = (name, value, onChange) => {
    const normalized = slashDateInput ? normalizeSlashDate(value) : value;
    const isComplete = !slashDateInput || value.replace(/\D/g, '').length === 8;
    setDateDrafts((prev) => ({ ...prev, [name]: isComplete && normalized ? formatSlashDate(normalized) : formatPartialSlashDate(value) }));
    if (!isComplete) return;
    if (onChange) onChange(normalized);
    else setForm((prev) => ({ ...prev, [name]: normalized }));
  };

  const openDatePicker = (name) => {
    const picker = datePickerRefs.current[name];
    if (!picker) return;
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  };

  // Helpers to reduce repetitive form markup and support read-only display
  const renderField = ({ id, label, name, type = 'text', placeholder = '', required = false, valueOverride, onChange, nativeDate = false, maxDate }) => {
    const value = valueOverride ?? form[name] ?? '';
    const isDate = type === 'date';
    const isNumeric = type === 'tel';
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
          type={nativeDate && !slashDateInput ? 'date' : isDate ? 'text' : type}
          className="form-input"
          placeholder={isDate ? 'yyyy/mm/dd' : placeholder}
          value={isDate ? getDateDisplayValue(name, value) : value}
          onChange={(e) => {
            if (isDate) {
              updateDateValue(name, e.target.value, onChange);
              return;
            }
            const nextValue = isNumeric ? e.target.value.replace(/\D/g, '') : e.target.value;
            if (onChange) {
              onChange(nextValue);
              return;
            }
            setForm((prev) => ({ ...prev, [name]: nextValue }));
          }}
          onBlur={isDate ? () => commitDateValue(name, getDateDisplayValue(name, value), onChange) : undefined}
          inputMode={isNumeric ? 'numeric' : undefined}
          pattern={isNumeric ? '[0-9]*' : undefined}
          max={maxDate}
          autoComplete={nativeDate ? 'off' : undefined}
          required={required}
        />
        {isDate && slashDateInput && !readOnly && (
          <>
            <button type="button" className="date-picker-button" onClick={() => openDatePicker(name)} aria-label={`Open calendar for ${label}`}>
              <span aria-hidden="true">▣</span>
            </button>
            <input
              ref={(element) => { datePickerRefs.current[name] = element; }}
              className="native-date-picker-input"
              type="date"
              value={formatDateForInput(value)}
              onChange={(event) => {
                const nextValue = event.target.value;
                setDateDrafts((prev) => ({ ...prev, [name]: formatSlashDate(nextValue) }));
                if (onChange) onChange(nextValue);
                else setForm((prev) => ({ ...prev, [name]: nextValue }));
              }}
              tabIndex={-1}
              aria-hidden="true"
            />
          </>
        )}
      </div>
    );
  };

  const renderSelect = ({ id, label, name, options = [], placeholder = '', required = false, onChange }) => {
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
          onChange={(e) => {
            if (onChange) {
              onChange(e.target.value);
              return;
            }
            setForm((prev) => name === 'community'
              ? { ...prev, community: e.target.value, groupId: '', batchId: '', group: '', batch: '' }
              : { ...prev, [name]: e.target.value });
          }}
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
      <div className="create-mother-general">
        <section className="create-mother-category">
          <h4 className="form-section-title">I.A Mother's Information</h4>
          <div className="form-row-5 full-width name-row">
          {renderField({ id: 'mother-first-name', label: "First Name", name: 'firstName', placeholder: 'First name', required: true })}
          {renderField({ id: 'mother-middle-name', label: "Middle Name", name: 'middleName', placeholder: 'Middle name' })}
          {renderField({ id: 'mother-last-name', label: "Last Name", name: 'lastName', placeholder: 'Last name', required: true })}
          {renderField({ id: 'mother-maiden-surname', label: "Maiden Surname", name: 'maidenSurname', placeholder: 'Maiden surname' })}
          {renderField({ id: 'mother-suffix', label: "Suffix", name: 'suffix', placeholder: 'Suffix' })}
          </div>

          <div className="form-row-2 full-width">
          {renderField({ id: 'mother-dob', label: "Date of Birth", name: 'dob', type: 'date', required: true, nativeDate: true, maxDate: new Date().toISOString().split('T')[0] })}
          {renderField({ id: 'mother-contact', label: "Contact Number", name: 'contactNumber', type: 'tel', placeholder: '0917******' })}
          </div>

          <div className="form-row-2 full-width">
          {readOnly ? (
            renderField({ id: 'mother-lmp', label: 'Date of LMP', name: 'lmpDate', type: 'date' })
          ) : (
            <div className="form-group">
              <label className="form-label" htmlFor="mother-lmp">Date of LMP</label>
              <input
                id="mother-lmp"
                type={slashDateInput ? 'text' : 'date'}
                className="form-input"
                placeholder={slashDateInput ? 'yyyy/mm/dd' : undefined}
                value={getDateDisplayValue('lmpDate', form.lmpDate)}
                onChange={(e) => updateDateValue('lmpDate', e.target.value, handleLmpChange)}
                onBlur={() => commitDateValue('lmpDate', getDateDisplayValue('lmpDate', form.lmpDate), handleLmpChange)}
                max={new Date().toISOString().split('T')[0]}
                autoComplete="off"
              />
              {slashDateInput && <>
                <button type="button" className="date-picker-button" onClick={() => openDatePicker('lmpDate')} aria-label="Open calendar for Date of LMP"><span aria-hidden="true">▣</span></button>
                <input
                  ref={(element) => { datePickerRefs.current.lmpDate = element; }}
                  className="native-date-picker-input"
                  type="date"
                  value={formatDateForInput(form.lmpDate)}
                  onChange={(e) => handleLmpChange(e.target.value)}
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </>}
            </div>
          )}

          {renderField({ id: 'mother-edd', label: "Expected Delivery Date (EDD)", name: 'eddDate', type: 'date', nativeDate: true })}
          </div>
        </section>

        <section className="create-mother-category">
          <h4 className="form-section-title">I.B ADDRESS DETAILS</h4>
          <div className="form-row-3 full-width">
          {renderField({ id: 'mother-province', label: 'Province', name: 'province', placeholder: 'Enter province' })}
          {renderField({ id: 'mother-city', label: 'City', name: 'city', placeholder: 'Enter city' })}
          {renderField({ id: 'mother-barangay', label: 'Barangay', name: 'barangay', placeholder: 'Enter barangay' })}
          </div>
        </section>

        <section className="create-mother-category">
          <h4 className="form-section-title">I.C COMMUNITY DETAILS</h4>
          <div className="form-row-3 full-width">
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
            onChange: (value) => {
              const selectedGroup = groups.find((group) => String(group.id) === String(value));
              setForm((prev) => ({
                ...prev,
                groupId: value,
                group: selectedGroup?.name || '',
                batchId: '',
                batch: '',
              }));
            },
          })}
          {renderSelect({
            id: 'mother-batch',
            label: 'Batch',
            name: 'batchId',
            options: selectedBatches.map((batch) => ({ value: batch.databaseId ?? batch.id, label: batch.name })),
            placeholder: 'Select batch',
            onChange: (value) => {
              const selectedBatch = batches.find((batch) => String(batch.databaseId ?? batch.id) === String(value));
              setForm((prev) => ({
                ...prev,
                batchId: value,
                batch: selectedBatch?.name || '',
              }));
            },
          })}
          </div>
        </section>

        <section className="create-mother-category">
          <h4 className="form-section-title">I.D EMERGENCY CONTACT</h4>
          <div className="form-row-3 full-width">
          {renderField({ id: 'emergency-name', label: 'Name', name: 'emergencyName', placeholder: 'Enter contact name' })}
          {renderField({ id: 'emergency-contact', label: 'Contact Number', name: 'emergencyContact', type: 'tel', placeholder: 'Enter contact number' })}
          {renderField({ id: 'emergency-relationship', label: 'Relationship', name: 'emergencyRelationship', placeholder: 'e.g. husband' })}
          </div>
        </section>

        <section className="create-mother-category">
          <h4 className="form-section-title">I.E OTHER DETAILS</h4>
          <label className="form-toggle-label" htmlFor="philhealth-member">
            <input
              id="philhealth-member"
              type="checkbox"
              className="form-checkbox"
              checked={!!form.philhealthMember}
              onChange={(event) => setForm((prev) => ({
                ...prev,
                philhealthMember: event.target.checked,
                philhealthNumber: event.target.checked ? prev.philhealthNumber : '',
              }))}
            />
            <span>PhilHealth member</span>
          </label>
          {form.philhealthMember && renderField({
            id: 'philhealth-number',
            label: 'PhilHealth Number',
            name: 'philhealthNumber',
            placeholder: 'Enter PhilHealth number',
          })}
        </section>
      </div>
    );
  }

  if (activeTab === 'prenatal') {
    return (
      <div className="create-mother-general create-mother-prenatal">
        <section className="create-mother-category">
          <h4 className="form-section-title">II. INITIAL PRENATAL ASSESSMENT & MATERNAL HEALTH PROFILE</h4>
          <div className="form-row-3 full-width">
          {renderField({ id: 'prenatal-reg-date', label: 'Date of Prenatal Registration', name: 'prenatalRegDate', type: 'date', nativeDate: true })}
          {renderSelect({ id: 'prenatal-trimester', label: 'Trimester at Registration', name: 'trimester', options: ['1st Trimester','2nd Trimester','3rd Trimester'] })}
          {renderField({ id: 'prenatal-gest-age', label: 'Gestational Age at Reg (weeks)', name: 'gestationalAge', placeholder: 'e.g. 12' })}
          </div>

          <div className="form-row-3 full-width">
          {renderField({ id: 'prenatal-weight', label: 'Weight (kg) at Reg', name: 'prenatalWeight', placeholder: 'e.g. 52' })}
          {renderField({ id: 'prenatal-bp', label: 'Blood Pressure (BP) at Reg', name: 'prenatalBp', placeholder: 'e.g. 120/80' })}
          {renderField({ id: 'prenatal-height', label: 'Height (cm) at Reg', name: 'prenatalHeight', placeholder: 'e.g. 150' })}
          </div>
        </section>

        <section className="create-mother-category">
          <h4 className="form-section-title">III. NUMBER OF PREGNANCIES & BIRTHS (OB)</h4>
          <div className="form-row-3 full-width">
          {renderField({ id: 'ob-gravida', label: 'Gravida (Pregnancies)', name: 'gravida', type: 'number', placeholder: 'Total pregnancies' })}
          {renderField({ id: 'ob-abortion', label: 'Abortion', name: 'abortion', type: 'number', placeholder: 'Spontaneous/induced' })}
          {renderField({ id: 'ob-stillbirth', label: 'Stillbirth', name: 'stillbirth', type: 'number', placeholder: 'Fetal death >20wks' })}
          </div>
        </section>

      </div>
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
      <div className="create-mother-general create-mother-medical">
        <section className="create-mother-category">
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
        </section>

        <section className="create-mother-category">
          <h4 className="form-section-title">IV.B DENTAL HEALTH CONDITION</h4>
          <div className="form-row-3 full-width">
          {renderField({ id: 'dental-date', label: 'Date of Dental Check-up', name: 'dentalCheckupDate', type: 'date', nativeDate: true })}
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
        </section>
      </div>
    );
  }

  if (activeTab === 'vaccine') {
    return (
      <div className="create-mother-general create-mother-vaccine">
        <section className="create-mother-category">
          <h4 className="form-section-title">IV.C VACCINE RECORD</h4>
          <div className="form-group full-width">
          <div className="form-panel vaccine-form-panel">
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
                          <>
                            <input
                              type={slashDateInput ? 'text' : 'date'}
                              className="form-input table-input"
                              placeholder={slashDateInput ? 'yyyy/mm/dd' : undefined}
                              value={getDateDisplayValue(`tt${num}Date`, form[`tt${num}Date`] || '')}
                              onChange={(e) => updateDateValue(`tt${num}Date`, e.target.value)}
                              onBlur={() => commitDateValue(`tt${num}Date`, getDateDisplayValue(`tt${num}Date`, form[`tt${num}Date`] || ''))}
                              autoComplete="off"
                            />
                            {slashDateInput && <>
                              <button type="button" className="date-picker-button" onClick={() => openDatePicker(`tt${num}Date`)} aria-label={`Open calendar for TT${num} date`}><span aria-hidden="true">▣</span></button>
                              <input
                                ref={(element) => { datePickerRefs.current[`tt${num}Date`] = element; }}
                                className="native-date-picker-input"
                                type="date"
                                value={formatDateForInput(form[`tt${num}Date`] || '')}
                                onChange={(e) => setForm((prev) => ({ ...prev, [`tt${num}Date`]: e.target.value }))}
                                tabIndex={-1}
                                aria-hidden="true"
                              />
                            </>}
                          </>
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
          </div>
        </section>
      </div>
    );
  }

  return null;
}
