import React from 'react';
import { formatDateForDisplay, formatDateForInput, maskDateInput, normalizeDateValue } from '../../../utils/dateFormat';
import { capitalizeNameValue } from '../../../utils/nameFormat';

export function ChildFormFields({ activeTab, form, setForm, communities = [], batches = [], readOnly = false, slashDateInput = true, birthDocumentFile, setBirthDocumentFile, existingBirthDocumentName = '' }) {
  const uniqueCommunities = Array.from(new Set(communities.map((comm) => comm.name))).filter(Boolean);
  const uniqueBatches = Array.from(new Set((batches || []).map((batch) => batch.name))).filter(Boolean);
  const [dateDrafts, setDateDrafts] = React.useState({});
  const datePickerRefs = React.useRef({});

  const getDateDisplayValue = (name, value) => dateDrafts[name] ?? (slashDateInput ? maskDateInput(value) : formatDateForInput(value));

  const updateDateValue = (name, value, onChange) => {
    const mask = slashDateInput ? maskDateInput(value) : value;
    setDateDrafts((prev) => ({ ...prev, [name]: mask }));

    const normalized = slashDateInput ? normalizeDateValue(mask) : value;
    if (!slashDateInput || (mask.replace(/\D/g, '').length === 8 && normalized)) {
      if (onChange) onChange(normalized || value);
      else setForm((prev) => ({ ...prev, [name]: normalized || value }));
    }
  };

  const commitDateValue = (name, value, onChange) => {
    const masked = slashDateInput ? maskDateInput(value) : value;
    const normalized = slashDateInput ? normalizeDateValue(masked) : value;
    setDateDrafts((prev) => ({ ...prev, [name]: masked }));

    if (!slashDateInput || !normalized) {
      if (onChange) onChange('');
      else setForm((prev) => ({ ...prev, [name]: '' }));
      return;
    }

    if (onChange) onChange(normalized);
    else setForm((prev) => ({ ...prev, [name]: normalized }));
  };

  const openDatePicker = (name) => {
    const picker = datePickerRefs.current[name];
    if (!picker) return;
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
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

  const renderField = ({ id, label, name, type = 'text', placeholder = '', required = false, min, step, nativeDate = false, maxDate, onChange }) => {
    const value = form[name] ?? '';
    const isDate = type === 'date';

    if (readOnly) {
      return (
        <div className="form-group">
          <label className="form-label">{label}</label>
          <div className="form-readonly-value">{isDate ? formatDateForDisplay(value) : value === '' || value === null || value === undefined ? '-' : value}</div>
        </div>
      );
    }

    const isNativeDate = nativeDate || (isDate && !slashDateInput);

    return (
      <div className="form-group">
        <label className="form-label" htmlFor={id}>{label}</label>
        <div className={isNativeDate ? 'date-input-container' : undefined}>
          <input
            id={id}
            type={isNativeDate ? 'date' : isDate ? 'text' : type}
            inputMode={isDate && !isNativeDate ? 'numeric' : undefined}
            pattern={isDate && !isNativeDate ? '\\d{2}/\\d{2}/\\d{4}' : undefined}
            className="form-input"
            placeholder={isDate && !isNativeDate ? 'DD/MM/YYYY' : placeholder}
            value={isNativeDate ? formatDateForInput(value) : isDate ? getDateDisplayValue(name, value) : value}
            min={min}
            step={step}
            max={maxDate}
            autoComplete={nativeDate ? 'off' : undefined}
            onChange={(e) => {
              if (isNativeDate) {
                const nextVal = e.target.value;
                if (onChange) onChange(nextVal);
                else setForm((prev) => ({ ...prev, [name]: nextVal }));
                return;
              }
              if (isDate) {
                updateDateValue(name, e.target.value, onChange);
                return;
              }
              const nextValue = /^(firstName|middleName|lastName|suffix|birthAttendant|birthPlace|leader)$/.test(name)
                ? capitalizeNameValue(e.target.value)
                : e.target.value;
              if (onChange) {
                onChange(nextValue);
                return;
              }
              setForm((prev) => ({ ...prev, [name]: nextValue }));
            }}
            onClick={isNativeDate ? (e) => { try { if (typeof e.target.showPicker === 'function') e.target.showPicker(); } catch (_) {} } : undefined}
            onBlur={isDate && !isNativeDate ? () => commitDateValue(name, getDateDisplayValue(name, value), onChange) : undefined}
            required={required}
          />
          {isNativeDate && (
            <button
              type="button"
              className="calendar-toggle-btn"
              onClick={() => {
                const el = document.getElementById(id);
                if (el) {
                  try {
                    if (typeof el.showPicker === 'function') el.showPicker();
                    else el.focus();
                  } catch (_) {
                    el.focus();
                  }
                }
              }}
              aria-label={`Open calendar for ${label}`}
              tabIndex={-1}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>
          )}
        </div>
        {!isNativeDate && isDate && slashDateInput && (
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
                setDateDrafts((prev) => ({ ...prev, [name]: maskDateInput(nextValue) }));
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

  const renderSelect = ({ id, label, name, options = [], placeholder = '' }) => {
    const value = form[name] ?? '';

    if (readOnly) {
      const selectedOption = options.find((option) => String(option.value ?? option) === String(value));
      const displayValue = selectedOption
        ? (selectedOption.label ?? selectedOption)
        : value || '-';

      return (
        <div className="form-group">
          <label className="form-label">{label}</label>
          <div className="form-readonly-value">{displayValue}</div>
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
      <div className="create-mother-general child-form-layout">
        <section className="create-mother-category">
        <h4 className="form-section-title">Child Information</h4>
        <div className="form-row-4 full-width name-row">
          {renderField({ id: 'child-first-name', label: 'First Name', name: 'firstName', placeholder: 'First name', required: true })}
          {renderField({ id: 'child-middle-name', label: 'Middle Name', name: 'middleName', placeholder: 'Middle name' })}
          {renderField({ id: 'child-last-name', label: 'Last Name', name: 'lastName', placeholder: 'Last name', required: true })}
          {renderField({ id: 'child-suffix', label: 'Suffix', name: 'suffix', placeholder: 'Suffix' })}
        </div>

        <div className="form-row-4 full-width">
          {renderField({ id: 'child-birth-date', label: 'Birth Date', name: 'birthDate', type: 'date', maxDate: new Date().toISOString().split('T')[0] })}
          {renderSelect({
            id: 'child-gender',
            label: 'Sex',
            name: 'gender',
            options: [{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }],
          })}
        </div>
        {readOnly && (
          <div className="form-group full-width">
            <label className="form-label">Mother</label>
            <div className="form-readonly-value">{form.motherName || '—'}</div>
          </div>
        )}
        {readOnly && (
          <div className="form-row-3 full-width">
            {['community', 'group', 'batch'].map((field) => (
              <div className="form-group" key={field}>
                <label className="form-label">{field === 'community' ? 'School' : field === 'group' ? 'Group' : 'Batch'}</label>
                <div className="form-readonly-value">{form[field] || '—'}</div>
              </div>
            ))}
          </div>
        )}

        </section>
        {!readOnly && (
          <section className="create-mother-category">
            <h4 className="form-section-title">Required Documents</h4>
            <div className="document-upload-field full-width">
              <label className="form-label" htmlFor="child-birth-document">Live Birth Certificate / Birth Certificate</label>
              <input
                id="child-birth-document"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(event) => setBirthDocumentFile?.(event.target.files?.[0] || null)}
              />
              {existingBirthDocumentName && <span className="document-upload-message">Current file: {existingBirthDocumentName}</span>}
              {birthDocumentFile && <span className="document-upload-message">Selected file: {birthDocumentFile.name}</span>}
            </div>
          </section>
        )}
      </div>
    );
  }

  if (activeTab === 'prenatal') {
    return (
      <div className="create-mother-general child-form-layout">
        <section className="create-mother-category">
        <h4 className="form-section-title">Prenatal / OB</h4>

        <div className="form-row-4 full-width">
          {renderField({ id: 'child-birth-weight', label: 'Birth Weight (kg)', name: 'birthWeight', placeholder: 'e.g. 3.2' })}
          {renderField({ id: 'child-birth-length', label: 'Birth Length (cm)', name: 'birthLength', placeholder: 'e.g. 49' })}
          {renderSelect({
            id: 'child-blood-type',
            label: 'Blood Type',
            name: 'bloodType',
            options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
            placeholder: 'Select blood type',
          })}
          {renderField({ id: 'child-children-delivered', label: 'No. of Child Delivered', name: 'noOfChildDelivered', type: 'number', min: 0, step: 1, placeholder: 'e.g. 1' })}
        </div>

        <div className="form-row-4 full-width">
          {renderSelect({
            id: 'child-multiple-birth-type',
            label: 'Multiple Birth Type',
            name: 'multipleBirthType',
            options: [{ value: '', label: 'None' }, { value: 'Twin', label: 'Twin' }, { value: 'Triplet', label: 'Triplet' }],
          })}
          {renderSelect({
            id: 'child-delivery-type',
            label: 'Delivery Type',
            name: 'deliveryType',
            options: [{ value: 'Vaginal', label: 'Vaginal' }, { value: 'Cesarean', label: 'Cesarean' }],
          })}
          {renderSelect({
            id: 'child-expanded-newborn-screening',
            label: 'Expanded Newborn Screening',
            name: 'expandedNewbornScreening',
            options: ['Normal', 'Needs Follow-up', 'Unknown'],
            placeholder: 'Select option',
          })}
        </div>

        <div className="form-row-4 full-width">
          {renderField({ id: 'child-birth-attendant', label: 'Birth Attendant', name: 'birthAttendant', placeholder: 'Midwife / Doctor' })}
          {renderField({ id: 'child-apgar', label: 'Apgar Score', name: 'apgarScore', placeholder: 'e.g. 8/10' })}
        </div>

        {renderTextarea({ id: 'child-nutrition-notes', label: 'Nutritional Notes', name: 'nutritionNotes', rows: 3, placeholder: 'Nutrition or feeding notes...' })}
        </section>
      </div>
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
      <div className="create-mother-general child-form-layout">
        <section className="create-mother-category">
        <h4 className="form-section-title">Medical Conditions</h4>
        <p className="form-optional-note">Optional</p>
        <div className="form-checkboxes-grid full-width">
          {readOnly ? (
            <div className="form-readonly-list">
              {conditionsKeys.filter(({ key }) => !!form.medicalConditions?.[key]).map(({ key, label }) => (
                <span key={key} className="readonly-badge">{label}</span>
              ))}
              {!conditionsKeys.some(({ key }) => !!form.medicalConditions?.[key]) && <div className="form-readonly-value">None</div>}
            </div>
          ) : conditionsKeys.map(({ key, label }) => (
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
        {renderTextarea({ id: 'child-medical-remarks', label: 'Medical Remarks', name: 'medicalRemarks', rows: 3, placeholder: 'Medical observations or remarks...', required: false })}
        </section>
      </div>
    );
  }

  if (activeTab === 'vaccine') {
    const vaccineRows = [
      { key: 'BCG', label: 'BCG', doseFields: ['bcgDose1', 'bcgDose2', 'bcgDose3'], remarksField: 'bcgRemarks' },
      { key: 'HepB', label: 'HepB', doseFields: ['hepbDose1', 'hepbDose2', 'hepbDose3'], remarksField: 'hepbRemarks' },
      { key: 'OPV', label: 'OPV', doseFields: ['opvDose1', 'opvDose2', 'opvDose3'], remarksField: 'opvRemarks' },
      { key: 'DPT', label: 'DPT', doseFields: ['dptDose1', 'dptDose2', 'dptDose3'], remarksField: 'dptRemarks' },
      { key: 'MMR', label: 'MMR', doseFields: ['mmrDose1', 'mmrDose2', 'mmrDose3'], remarksField: 'mmrRemarks' },
    ];

    return (
      <div className="create-mother-general child-form-layout">
        <section className="create-mother-category">
          <h4 className="form-section-title">Vaccination Record</h4>
          <p className="form-optional-note">Optional</p>
          <div className="form-group full-width">
            <div className="form-panel">
              <div className="vaccine-dose-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(3, minmax(140px, 1fr)) 1.3fr', gap: '0.75rem', alignItems: 'start' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', paddingTop: '0.5rem' }}>Vaccine</div>
                <div style={{ fontWeight: 800, color: '#0f172a', paddingTop: '0.5rem' }}>Dose 1</div>
                <div style={{ fontWeight: 800, color: '#0f172a', paddingTop: '0.5rem' }}>Dose 2</div>
                <div style={{ fontWeight: 800, color: '#0f172a', paddingTop: '0.5rem' }}>Dose 3</div>
                <div style={{ fontWeight: 800, color: '#0f172a', paddingTop: '0.5rem' }}>Remarks</div>

                {vaccineRows.map(({ key, label, doseFields, remarksField }) => (
                  <React.Fragment key={key}>
                    <div style={{ display: 'flex', alignItems: 'center', minHeight: '62px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>{label}</div>
                    {doseFields.map((doseField, index) => (
                      <div key={`${key}-${doseField}`}>
                        {renderField({
                          id: `child-${key.toLowerCase()}-${index + 1}`,
                          label: `${label} Dose ${index + 1}`,
                          name: doseField,
                          type: 'date',
                          required: false,
                        })}
                      </div>
                    ))}
                    <div>
                      {renderField({
                        id: `child-${key.toLowerCase()}-remarks`,
                        label: `${label} Remarks`,
                        name: remarksField,
                        placeholder: 'Remarks',
                        required: false,
                      })}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return null;
}
