import React from 'react';
import { formatDateForDisplay, formatDateForInput, maskDateInput, normalizeDateValue } from '../../../utils/dateFormat';
import { capitalizeNameValue } from '../../../utils/nameFormat';
import { CHILD_VACCINE_SEQUENCES } from '../../../utils/childRecordValidation';

export function ChildFormFields({ activeTab, form, setForm, communities = [], batches = [], readOnly = false, slashDateInput = true, birthDocumentFile, setBirthDocumentFile, existingBirthDocumentName = '', showRequiredValidation = false, validationErrors = {} }) {
  const uniqueCommunities = Array.from(new Set(communities.map((comm) => comm.name))).filter(Boolean);
  const uniqueBatches = Array.from(new Set((batches || []).map((batch) => batch.name))).filter(Boolean);
  const [dateDrafts, setDateDrafts] = React.useState({});
  const datePickerRefs = React.useRef({});
  const [locationOptions, setLocationOptions] = React.useState(null);
  const [locationLoadError, setLocationLoadError] = React.useState('');

  React.useEffect(() => {
    let active = true;
    import('../../../utils/philippineLocations')
      .then((locations) => {
        if (active) setLocationOptions(locations);
      })
      .catch((error) => {
        console.error('Failed to load child birth place options:', error);
        if (active) setLocationLoadError('Unable to load province and city options. Please refresh and try again.');
      });
    return () => { active = false; };
  }, []);

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

  const updateVaccineDate = (field, value) => {
    const sequence = CHILD_VACCINE_SEQUENCES.find((fields) => fields.includes(field));
    const doseIndex = sequence?.indexOf(field) ?? -1;
    const dependentFields = doseIndex >= 0 ? sequence.slice(doseIndex + 1) : [];
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (!value) dependentFields.forEach((dependentField) => { next[dependentField] = ''; });
      return next;
    });
    if (!value && dependentFields.length) {
      setDateDrafts((prev) => {
        const next = { ...prev };
        dependentFields.forEach((dependentField) => { delete next[dependentField]; });
        return next;
      });
    }
  };

  const renderField = ({ id, label, name, type = 'text', placeholder = '', required = false, min, minDate, maxValue, step, nativeDate = false, maxDate, disabled = false, onChange, className = '' }) => {
    const value = form[name] ?? '';
    const isDate = type === 'date';
    const isName = /^(firstName|middleName|lastName)$/.test(name);
    const validationError = validationErrors[name];
    const hasMissingValue = showRequiredValidation
      && ((required && !String(value ?? '').trim()) || Boolean(validationError));

    if (readOnly) {
      return (
        <div className={`form-group ${className}`}>
          <label className="form-label">{label}</label>
          <div className="form-readonly-value">{isDate ? formatDateForDisplay(value) : value === '' || value === null || value === undefined ? '-' : value}</div>
        </div>
      );
    }

    const isNativeDate = nativeDate || (isDate && !slashDateInput);

    return (
      <div className={`form-group ${className}`}>
        <label className="form-label" htmlFor={id}>{label}{required && <span className="form-required-indicator" aria-hidden="true">*</span>}</label>
        <div className={isNativeDate ? 'date-input-container' : undefined}>
          <input
            id={id}
            type={isNativeDate ? 'date' : isDate ? 'text' : type}
            inputMode={isDate && !isNativeDate ? 'numeric' : undefined}
            pattern={isDate && !isNativeDate ? '\\d{2}/\\d{2}/\\d{4}' : undefined}
            className={`form-input${hasMissingValue ? ' invalid' : ''}`}
            placeholder={isDate && !isNativeDate ? 'DD/MM/YYYY' : placeholder}
            value={isNativeDate ? formatDateForInput(value) : isDate ? getDateDisplayValue(name, value) : value}
            min={isDate ? minDate : min}
            step={step}
            max={isDate ? maxDate : maxValue}
            maxLength={isName ? 100 : undefined}
            autoComplete={isName
              ? name === 'firstName' ? 'given-name' : name === 'middleName' ? 'additional-name' : 'family-name'
              : nativeDate ? 'off' : undefined}
            spellCheck={isName ? false : undefined}
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
              const nextValue = isName
                ? e.target.value
                : /^(suffix|birthAttendant|birthPlace|leader)$/.test(name)
                  ? capitalizeNameValue(e.target.value)
                  : e.target.value;
              if (onChange) {
                onChange(nextValue);
                return;
              }
              setForm((prev) => ({ ...prev, [name]: nextValue }));
            }}
            onBlur={isName ? () => {
              const formattedValue = capitalizeNameValue(value);
              if (formattedValue !== value) {
                if (onChange) onChange(formattedValue);
                else setForm((prev) => ({ ...prev, [name]: formattedValue }));
              }
            } : isDate && !isNativeDate
              ? () => commitDateValue(name, getDateDisplayValue(name, value), onChange)
              : undefined}
            onClick={isNativeDate ? (e) => { try { if (typeof e.target.showPicker === 'function') e.target.showPicker(); } catch (_) {} } : undefined}
            required={required}
            aria-invalid={hasMissingValue}
            aria-describedby={validationError && showRequiredValidation ? `${id}-error` : undefined}
            disabled={disabled}
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
              disabled={disabled}
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
            <button type="button" className="date-picker-button" onClick={() => openDatePicker(name)} aria-label={`Open calendar for ${label}`} disabled={disabled}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
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
              disabled={disabled}
            />
          </>
        )}
        {validationError && showRequiredValidation && <small id={`${id}-error`} className="field-validation-error" role="alert">{validationError}</small>}
      </div>
    );
  };

  const renderSelect = ({ id, label, name, options = [], placeholder = '', disabled = false, onChange, className = '' }) => {
    const value = form[name] ?? '';

    if (readOnly) {
      const selectedOption = options.find((option) => String(option.value ?? option) === String(value));
      const displayValue = selectedOption
        ? (selectedOption.label ?? selectedOption)
        : value || '-';

      return (
        <div className={`form-group ${className}`}>
          <label className="form-label">{label}</label>
          <div className="form-readonly-value">{displayValue}          </div>
        </div>
      );
    };

    return (
      <div className={`form-group ${className}`}>
        <label className="form-label" htmlFor={id}>{label}</label>
        <select
          id={id}
          className="form-select"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            if (onChange) onChange(e.target.value);
            else setForm((prev) => ({ ...prev, [name]: e.target.value }));
          }}
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
          className={`form-input${validationErrors[name] && showRequiredValidation ? ' invalid' : ''}`}
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))}
        />
        {validationErrors[name] && showRequiredValidation && <small className="field-validation-error" role="alert">{validationErrors[name]}</small>}
      </div>
    );
  };

  if (activeTab === 'general') {
    return (
      <div className="create-mother-general child-form-layout">
        <section className="create-mother-category">
        <h4 className="form-section-title">Child Information</h4>
        <div className="form-row-4 full-width name-row">
          {renderField({ id: 'child-first-name', label: 'First Name', name: 'firstName', placeholder: 'e.g. Mary Princess', required: true })}
          {renderField({ id: 'child-middle-name', label: 'Middle Name', name: 'middleName', placeholder: 'Middle name' })}
          {renderField({ id: 'child-last-name', label: 'Last Name', name: 'lastName', placeholder: 'Last name', required: true })}
          {renderField({ id: 'child-suffix', label: 'Suffix', name: 'suffix', placeholder: 'Suffix' })}
        </div>

        {renderSelect({
          id: 'child-gender',
          label: 'Sex',
          name: 'gender',
          options: [{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }],
          className: 'narrow-field',
        })}
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
            <h4 className="form-section-title">Birth Certificate (Optional)</h4>
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
          <h4 className="form-section-title">Birth &amp; Newborn Details</h4>
          <div className="child-form-subsection">
            <h5 className="child-form-subsection-title">Birth Date &amp; Location</h5>
            <div className="form-row-3 full-width">
              {renderField({
                id: 'child-birth-date',
                label: 'Birth Date',
                name: 'birthDate',
                type: 'date',
                required: true,
                maxDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
              })}
              {renderSelect({
                id: 'child-birth-province',
                label: 'Birth Province',
                name: 'birthPlaceProvince',
                options: locationOptions?.PHILIPPINE_PROVINCES || [],
                placeholder: locationLoadError ? 'Province options unavailable' : locationOptions ? 'Select province' : 'Loading provinces…',
                disabled: !locationOptions || Boolean(locationLoadError),
                onChange: (province) => setForm((prev) => ({
                  ...prev,
                  birthPlaceProvince: province,
                  birthPlaceCity: '',
                })),
              })}
              {renderSelect({
                id: 'child-birth-city',
                label: 'Birth City / Municipality',
                name: 'birthPlaceCity',
                options: (() => {
                  const province = form.birthPlaceProvince;
                  const cities = province ? locationOptions?.getPhilippineCities(province) || [] : [];
                  return form.birthPlaceCity && !cities.includes(form.birthPlaceCity)
                    ? [form.birthPlaceCity, ...cities]
                    : cities;
                })(),
                placeholder: form.birthPlaceProvince
                  ? 'Select city / municipality'
                  : 'Select province first',
                disabled: !form.birthPlaceProvince || !locationOptions || Boolean(locationLoadError),
              })}
            </div>
            {locationLoadError && !readOnly && <small className="field-validation-error" role="alert">{locationLoadError}</small>}
          </div>
          <div className="child-form-subsection">
            <h5 className="child-form-subsection-title">Birth Measurements</h5>
            <div className="form-row-4 full-width">
              {renderField({ id: 'child-birth-weight', label: 'Birth Weight (kg)', name: 'birthWeight', type: 'number', min: 0.3, maxValue: 10, step: 0.01, placeholder: 'e.g. 3.2' })}
              {renderField({ id: 'child-birth-length', label: 'Birth Length (cm)', name: 'birthLength', type: 'number', min: 20, maxValue: 80, step: 0.1, placeholder: 'e.g. 49' })}
              {renderField({ id: 'child-head-circumference', label: 'Head Circumference (cm)', name: 'headCircumference', type: 'number', min: 15, maxValue: 60, step: 0.1, placeholder: 'e.g. 34' })}
              {renderField({ id: 'child-chest-circumference', label: 'Chest Circumference (cm)', name: 'chestCircumference', type: 'number', min: 15, maxValue: 60, step: 0.1, placeholder: 'e.g. 32' })}
            </div>
          </div>

          <div className="child-form-subsection">
            <h5 className="child-form-subsection-title">Delivery Details</h5>
            <div className="form-row-4 full-width child-birth-place-row">
              {renderField({ id: 'child-birth-attendant', label: 'Birth Attendant', name: 'birthAttendant', placeholder: 'Midwife / Doctor' })}
              {renderSelect({
                id: 'child-delivery-type',
                label: 'Delivery Type',
                name: 'deliveryType',
                options: [{ value: 'Vaginal', label: 'Vaginal' }, { value: 'Cesarean', label: 'Cesarean' }],
              })}
            </div>
            <div className="form-row-2 full-width">
              {renderField({ id: 'child-children-delivered', label: 'No. of Child Delivered', name: 'noOfChildDelivered', type: 'number', min: 1, maxValue: 20, step: 1, placeholder: 'e.g. 1' })}
              {renderSelect({
                id: 'child-multiple-birth-type',
                label: 'Multiple Birth Type',
                name: 'multipleBirthType',
                options: [{ value: '', label: 'None' }, { value: 'Twin', label: 'Twin' }, { value: 'Triplet', label: 'Triplet' }],
              })}
            </div>
          </div>

          <div className="child-form-subsection">
            <h5 className="child-form-subsection-title">Newborn Health &amp; Screening</h5>
            <div className="form-row-3 full-width">
              {renderSelect({
                id: 'child-blood-type',
                label: 'Blood Type',
                name: 'bloodType',
                options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
                placeholder: 'Select blood type',
              })}
              {renderField({ id: 'child-apgar', label: 'Apgar Score', name: 'apgarScore', placeholder: 'e.g. 8/10' })}
              {renderSelect({
                id: 'child-exclusive-breastfeeding',
                label: 'Exclusive Breastfeeding',
                name: 'exclusiveBreastfeeding',
                options: ['Yes', 'No'],
                placeholder: 'Select answer',
              })}
            </div>
            <div className="form-row-2 full-width">
              {renderSelect({
                id: 'child-expanded-newborn-screening',
                label: 'Expanded Newborn Screening',
                name: 'expandedNewbornScreening',
                options: ['Negative', 'Potentially Positive', 'Inconclusive', 'Not Screened'],
                placeholder: 'Select result',
              })}
              {renderField({ id: 'child-newborn-screening-result', label: 'Newborn Screening Notes / Result', name: 'expandedNewbornScreeningResult', placeholder: 'Enter result details', className: 'full-width newborn-screening-notes-field' })}
            </div>
          </div>
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
      { key: 'IPV', label: 'Inactivated Polio Vaccine', doseFields: ['ipvDose1', 'ipvDose2', 'ipvDose3'], remarksField: 'ipvRemarks' },
      { key: 'OPV', label: 'OPV', doseFields: ['opvDose1', 'opvDose2', 'opvDose3'], remarksField: 'opvRemarks' },
      { key: 'PCV', label: 'Pneumococcal (PCV)', doseFields: ['pcvDose1', 'pcvDose2', 'pcvDose3'], remarksField: 'pcvRemarks' },
      { key: 'DPT', label: 'Pentavalent Vaccine', doseFields: ['dptDose1', 'dptDose2', 'dptDose3'], remarksField: 'dptRemarks' },
      { key: 'MMR', label: 'MMR', doseFields: ['mmrDose1', 'mmrDose2', 'mmrDose3'], remarksField: 'mmrRemarks' },
    ];

    return (
      <div className="create-mother-general child-form-layout">
        <section className="create-mother-category">
          <h4 className="form-section-title">Vaccination Record</h4>
          <p className="form-optional-note">Optional</p>
          <div className="form-group full-width">
            <div className="form-panel vaccine-form-panel">
              <div className="vaccine-form-table-wrapper">
                <table className="vaccine-form-table">
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Vaccine</th>
                      <th style={{ width: '18%' }}>Dose 1</th>
                      <th style={{ width: '18%' }}>Dose 2</th>
                      <th style={{ width: '18%' }}>Dose 3</th>
                      <th style={{ width: '21%' }}>Remarks / Facility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vaccineRows.map(({ key, label, doseFields, remarksField }) => (
                      <tr key={key}>
                        <td data-label="Vaccine"><strong>{label}</strong></td>
                        {doseFields.map((doseField, index) => (
                          <td key={`${key}-${doseField}`} data-label={`Dose ${index + 1}`}>
                            {renderField({
                              id: `child-${key.toLowerCase()}-${index + 1}`,
                              label: `${label} Dose ${index + 1}`,
                              name: doseField,
                              type: 'date',
                              minDate: form.birthDate || undefined,
                              maxDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
                              disabled: index > 0 && !form[doseFields[index - 1]],
                              onChange: (value) => updateVaccineDate(doseField, value),
                            })}
                          </td>
                        ))}
                        <td data-label="Remarks / Facility">
                          {renderField({
                            id: `child-${key.toLowerCase()}-remarks`,
                            label: `${label} Remarks / Facility`,
                            name: remarksField,
                            placeholder: 'Remarks / facility',
                          })}
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
