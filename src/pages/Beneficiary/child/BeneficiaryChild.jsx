import React from 'react';
import { formatDateForDisplay, formatDateForInput } from '../../../utils/dateFormat';

export function ChildFormFields({ activeTab, form, setForm, communities = [], batches = [], readOnly = false, slashDateInput = true }) {
  const uniqueCommunities = Array.from(new Set(communities.map((comm) => comm.name))).filter(Boolean);
  const uniqueBatches = Array.from(new Set((batches || []).map((batch) => batch.name))).filter(Boolean);
  const [dateDrafts, setDateDrafts] = React.useState({});
  const datePickerRefs = React.useRef({});

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
          <div className="form-readonly-value">{isDate ? formatDateForDisplay(value) : value || '-'}</div>
        </div>
      );
    }

    return (
      <div className="form-group">
        <label className="form-label" htmlFor={id}>{label}</label>
        <input
          id={id}
          type={nativeDate && !slashDateInput ? 'date' : isDate ? 'text' : type}
          inputMode={isDate ? 'numeric' : undefined}
          pattern={isDate ? '\\d{4}/\\d{2}/\\d{2}' : undefined}
          className="form-input"
          placeholder={isDate ? 'yyyy/mm/dd' : placeholder}
          value={isDate ? getDateDisplayValue(name, value) : value}
          min={min}
          step={step}
          max={maxDate}
          autoComplete={nativeDate ? 'off' : undefined}
          onChange={(e) => {
            if (isDate) {
              updateDateValue(name, e.target.value, onChange);
              return;
            }
            if (onChange) {
              onChange(e.target.value);
              return;
            }
            setForm((prev) => ({ ...prev, [name]: e.target.value }));
          }}
          onBlur={isDate ? () => commitDateValue(name, getDateDisplayValue(name, value), onChange) : undefined}
          required={required}
        />
        {isDate && slashDateInput && (
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
          {renderField({ id: 'child-birth-date', label: 'Birth Date', name: 'birthDate', type: 'date', nativeDate: true, maxDate: new Date().toISOString().split('T')[0] })}
          {renderSelect({
            id: 'child-gender',
            label: 'Gender',
            name: 'gender',
            options: [{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }],
          })}
        </div>

        </section>
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
            placeholder: 'Select type',
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
        {renderTextarea({ id: 'child-medical-remarks', label: 'Medical Remarks', name: 'medicalRemarks', rows: 3, placeholder: 'Medical observations or remarks...' })}
        </section>
      </div>
    );
  }

  if (activeTab === 'vaccine') {
    return (
      <div className="create-mother-general child-form-layout">
        <section className="create-mother-category">
        <h4 className="form-section-title">Vaccination Record</h4>
        <div className="form-group full-width">
          <div className="form-panel">
            <div className="form-row-4 full-width">
              {renderField({ id: 'child-bcg-date', label: 'BCG Date', name: 'bcgDate', type: 'date', nativeDate: true })}
              {renderField({ id: 'child-bcg-remarks', label: 'BCG Remarks', name: 'bcgRemarks', placeholder: 'Remarks' })}
              {renderField({ id: 'child-hepb-date', label: 'HepB Date', name: 'hepbDate', type: 'date', nativeDate: true })}
              {renderField({ id: 'child-hepb-remarks', label: 'HepB Remarks', name: 'hepbRemarks', placeholder: 'Remarks' })}
            </div>
            <div className="form-row-4 full-width">
              {renderField({ id: 'child-opv-date', label: 'OPV Date', name: 'opvDate', type: 'date', nativeDate: true })}
              {renderField({ id: 'child-opv-remarks', label: 'OPV Remarks', name: 'opvRemarks', placeholder: 'Remarks' })}
              {renderField({ id: 'child-dpt-date', label: 'DPT Date', name: 'dptDate', type: 'date', nativeDate: true })}
              {renderField({ id: 'child-dpt-remarks', label: 'DPT Remarks', name: 'dptRemarks', placeholder: 'Remarks' })}
            </div>
            <div className="form-row-2 full-width">
              {renderField({ id: 'child-mmr-date', label: 'MMR Date', name: 'mmrDate', type: 'date', nativeDate: true })}
              {renderField({ id: 'child-mmr-remarks', label: 'MMR Remarks', name: 'mmrRemarks', placeholder: 'Remarks' })}
            </div>
          </div>
        </div>
        </section>
      </div>
    );
  }

  return null;
}
