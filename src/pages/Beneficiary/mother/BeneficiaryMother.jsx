import React from 'react';
import { formatDateForDisplay, formatDateForInput, maskDateInput, normalizeDateValue } from '../../../utils/dateFormat';
import { calculateGestationalDetails } from '../../../utils/beneficiaryHelpers';
import { capitalizeNameValue } from '../../../utils/nameFormat';

export const OTHER_MATERNAL_VACCINES = [
  { label: 'Influenza (flu)', key: 'influenza' },
  { label: 'Hepatitis A', key: 'hepatitisA' },
  { label: 'Hepatitis B', key: 'hepatitisB' },
  { label: 'COVID-19', key: 'covid19' },
];

const calculateEddDate = (value) => {
  const normalized = formatDateForInput(value);
  if (!normalized) return '';
  const [year, month, day] = normalized.split('-').map(Number);
  const edd = new Date(year, month - 1, day);
  edd.setDate(edd.getDate() + 280);
  return `${edd.getFullYear()}-${String(edd.getMonth() + 1).padStart(2, '0')}-${String(edd.getDate()).padStart(2, '0')}`;
};

export function MotherFormFields({
  activeTab,
  form,
  setForm,
  communities = [],
  groups = [],
  batches = [],
  readOnly = false,
  slashDateInput = true,
  documentFiles = {},
  setDocumentFiles,
  documentContent = null,
  hideSchoolField = false,
  showRequiredValidation = false,
}) {
  const [dateDrafts, setDateDrafts] = React.useState({});
  const datePickerRefs = React.useRef({});
  const [locationOptions, setLocationOptions] = React.useState(null);
  const [locationLoadError, setLocationLoadError] = React.useState('');
  const [barangayOptions, setBarangayOptions] = React.useState([]);
  const [barangaysLoading, setBarangaysLoading] = React.useState(false);
  const [barangaysLoadError, setBarangaysLoadError] = React.useState('');
  const uniqueCommunities = Array.from(new Set(communities.map((comm) => comm.name))).filter(Boolean);
  const selectedGroups = groups.filter((group) => !form.community || group.community === form.community);
  const selectedGroupId = String(form.groupId ?? '').trim();
  const selectedBatches = batches.filter((batch) => {
    const sameCommunity = !form.community || !batch.community || batch.community === form.community;
    if (!sameCommunity) return false;
    if (!selectedGroupId) return true;

    const batchGroupIds = String(batch.groupIds || batch.group_id || batch.groupId || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    return batchGroupIds.length === 0 || batchGroupIds.includes(selectedGroupId) || String(batch.group_id || batch.groupId || '') === selectedGroupId;
  });
  const selectedProvince = locationOptions?.PHILIPPINE_PROVINCES.find((province) => province.toLowerCase() === String(form.province || '').toLowerCase()) || '';
  const cityOptions = selectedProvince ? locationOptions?.getPhilippineCities(selectedProvince) || [] : [];
  const selectedCity = cityOptions.find((city) => city.toLowerCase() === String(form.city || '').toLowerCase()) || '';
  const selectedBarangay = barangayOptions.find((barangay) => barangay.toLowerCase() === String(form.barangay || '').toLowerCase()) || '';
  const prenatalWeight = Number(form.prenatalWeight);
  const prenatalHeight = Number(form.prenatalHeight);
  const prenatalBmiValue = Number.isFinite(prenatalWeight) && prenatalWeight > 0
    && Number.isFinite(prenatalHeight) && prenatalHeight > 0
    ? prenatalWeight / ((prenatalHeight / 100) ** 2)
    : null;
  const prenatalBmi = prenatalBmiValue === null ? '—' : prenatalBmiValue.toFixed(1);
  const prenatalBmiStatus = prenatalBmiValue === null
    ? '—'
    : prenatalBmiValue < 18.5 ? 'Underweight' : prenatalBmiValue < 25 ? 'Normal' : prenatalBmiValue < 30 ? 'Overweight' : 'Obese';

  React.useEffect(() => {
    let active = true;
    import('../../../utils/philippineLocations')
      .then((locations) => {
        if (active) setLocationOptions(locations);
      })
      .catch((error) => {
        console.error('Failed to load Philippine location options:', error);
        if (active) setLocationLoadError('Unable to load province and city options. Please refresh and try again.');
      });
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    let active = true;
    setBarangayOptions([]);
    setBarangaysLoadError('');
    if (!selectedProvince || !selectedCity || !locationOptions) {
      setBarangaysLoading(false);
      return undefined;
    }

    setBarangaysLoading(true);
    locationOptions.getPhilippineBarangays(selectedProvince, selectedCity)
      .then((options) => {
        if (active) setBarangayOptions(options);
      })
      .catch((error) => {
        console.error('Failed to load Philippine barangay options:', error);
        if (active) setBarangaysLoadError('Unable to load barangay options. Please refresh and try again.');
      })
      .finally(() => {
        if (active) setBarangaysLoading(false);
      });

    return () => { active = false; };
  }, [locationOptions, selectedCity, selectedProvince]);

  React.useEffect(() => {
    if (readOnly || typeof setForm !== 'function') return;
    if ((selectedProvince && selectedProvince !== form.province)
      || (selectedCity && selectedCity !== form.city)
      || (selectedBarangay && selectedBarangay !== form.barangay)) {
      setForm((prev) => ({
        ...prev,
        province: selectedProvince || prev.province,
        city: selectedCity || prev.city,
        barangay: selectedBarangay || prev.barangay,
      }));
    }
  }, [selectedProvince, selectedCity, form.province, form.city, form.barangay, barangayOptions, selectedBarangay]);

  const handleLmpChange = (val) => {
    setForm((prev) => ({ ...prev, lmpDate: val }));
  };

  React.useEffect(() => {
    if (readOnly || typeof setForm !== 'function') return;
    const referenceDate = form.prenatalRegDate || new Date().toISOString().slice(0, 10);
    const eddDate = calculateEddDate(form.lmpDate);
    if (!eddDate) return;
    const pregnancyDetails = calculateGestationalDetails(form.lmpDate, referenceDate);
    if (form.eddDate === eddDate
      && form.gestationalAge === pregnancyDetails.gestationalAge
      && form.trimester === pregnancyDetails.trimester) return;
    setForm((prev) => ({ ...prev, eddDate, ...pregnancyDetails }));
  }, [form.lmpDate, form.prenatalRegDate, readOnly, setForm]);

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

  const getDateDisplayValue = (name, value) => dateDrafts[name] ?? (slashDateInput ? maskDateInput(value) : formatDateForInput(value));

  const updateDateValue = (name, value, onChange) => {
    const masked = slashDateInput ? maskDateInput(value) : value;
    setDateDrafts((prev) => ({ ...prev, [name]: masked }));

    if (!slashDateInput) return;

    const normalized = normalizeDateValue(masked);
    if (masked.replace(/\D/g, '').length === 8 && normalized) {
      if (onChange) onChange(normalized);
      else setForm((prev) => ({ ...prev, [name]: normalized }));
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

  // Helpers to reduce repetitive form markup and support read-only display
  const renderField = ({ id, label, name, type = 'text', placeholder = '', required = false, valueOverride, onChange, nativeDate = false, maxDate, minValue, disabled = false }) => {
    const value = valueOverride ?? form[name] ?? '';
    const isDate = type === 'date';
    const isNumeric = type === 'tel';
    const hasMissingValue = required && !String(value ?? '').trim() && showRequiredValidation;
    if (readOnly) {
      return (
        <div className="form-group">
          <label className="form-label">{label}</label>
          <div className="form-readonly-value">{isDate ? formatDateForDisplay(value) : value === '' || value === null || value === undefined ? '—' : value}</div>
        </div>
      );
    }

    const isNativeDate = nativeDate || (isDate && !slashDateInput);

    return (
      <div className="form-group">
        <label className="form-label" htmlFor={id}>
          {label}{required && <span className="form-required-indicator" aria-hidden="true"> *</span>}
        </label>
        <div className={isNativeDate ? 'date-input-container' : undefined}>
          <input
            id={id}
            type={isNativeDate ? 'date' : isDate ? 'text' : type}
            className={`form-input${hasMissingValue ? ' invalid' : ''}`}
            placeholder={isDate && !isNativeDate ? 'DD/MM/YYYY' : placeholder}
            value={isNativeDate ? formatDateForInput(value) : isDate ? getDateDisplayValue(name, value) : value}
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
              const rawValue = isNumeric ? e.target.value.replace(/\D/g, '') : e.target.value;
              const nextValue = /^(firstName|middleName|lastName|maidenSurname|suffix|emergencyName|spouseFirstName|spouseSurname)$/.test(name)
                ? capitalizeNameValue(rawValue)
                : rawValue;
              if (onChange) {
                onChange(nextValue);
                return;
              }
              setForm((prev) => ({ ...prev, [name]: nextValue }));
            }}
            onClick={isNativeDate ? (e) => { try { if (typeof e.target.showPicker === 'function') e.target.showPicker(); } catch (_) {} } : undefined}
            onBlur={isDate && !isNativeDate ? () => commitDateValue(name, getDateDisplayValue(name, value), onChange) : undefined}
            inputMode={isNumeric ? 'numeric' : undefined}
            pattern={isNumeric ? '[0-9]*' : undefined}
            max={maxDate}
            min={minValue}
            autoComplete={nativeDate ? 'off' : undefined}
            required={required}
            aria-invalid={hasMissingValue}
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
        {!isNativeDate && isDate && slashDateInput && !readOnly && (
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

  const renderSelect = ({ id, label, name, options = [], placeholder = '', required = false, onChange, disabled = false }) => {
    const value = form[name] ?? '';
    const hasMissingValue = required && !String(value ?? '').trim() && showRequiredValidation;
    if (readOnly) {
      return (
        <div className="form-group">
          <label className="form-label">{label}</label>
          <div className="form-readonly-value">{value === '' || value === null || value === undefined ? '—' : value}</div>
        </div>
      );
    }

    return (
      <div className="form-group">
        <label className="form-label" htmlFor={id}>
          {label}{required && <span className="form-required-indicator" aria-hidden="true"> *</span>}
        </label>
        <select
          id={id}
          className={`form-select${hasMissingValue ? ' invalid' : ''}`}
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
          aria-invalid={hasMissingValue}
          disabled={disabled}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value ?? opt} value={opt.value ?? opt}>{opt.label ?? opt}</option>
          ))}
        </select>
      </div>
    );
  };

  const renderTextarea = ({ id, label, name, rows = 2, placeholder = '', required = false }) => {
    const value = form[name] ?? '';
    if (readOnly) {
      return (
        <div className="form-group full-width">
          <label className="form-label">{label}</label>
          <div className="form-readonly-value">{value === '' || value === null || value === undefined ? '—' : value}</div>
        </div>
      );
    }

    return (
      <div className="form-group full-width">
        <label className="form-label" htmlFor={id}>
          {label}{required && <span className="form-required-indicator" aria-hidden="true"> *</span>}
        </label>
        <textarea
          id={id}
          className="form-input"
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setForm((prev) => ({ ...prev, [name]: e.target.value }))}
          required={required}
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
          {renderField({ id: 'mother-middle-name', label: "Middle Name", name: 'middleName', placeholder: 'Middle name', required: true })}
          {renderField({ id: 'mother-last-name', label: "Last Name", name: 'lastName', placeholder: 'Last name', required: true })}
          {renderField({ id: 'mother-maiden-surname', label: "Maiden Surname", name: 'maidenSurname', placeholder: 'Maiden surname', required: true })}
          {renderField({ id: 'mother-suffix', label: "Suffix", name: 'suffix', placeholder: 'Suffix' })}
          </div>

          <div className="form-row-2 full-width">
          {renderField({ id: 'mother-dob', label: "Date of Birth", name: 'dob', type: 'date', required: true, maxDate: new Date().toISOString().split('T')[0] })}
          {renderField({ id: 'mother-contact', label: "Contact Number", name: 'contactNumber', type: 'tel', placeholder: '0917******', required: true })}
          </div>

          <div className="form-row-2 full-width">
          {renderField({ id: 'mother-place-of-birth', label: 'Place of Birth', name: 'birthPlace', placeholder: 'City / Municipality' })}
          {renderField({ id: 'mother-allergies', label: 'Allergies', name: 'allergies', placeholder: 'List known allergies, if any' })}
          </div>
          <div className="form-row-3 full-width">
          {renderSelect({
            id: 'mother-blood-type',
            label: 'Blood Type',
            name: 'bloodType',
            options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
            placeholder: 'Select blood type',
          })}
          {renderSelect({
            id: 'mother-civil-status',
            label: 'Civil Status',
            name: 'civilStatus',
            options: ['Single', 'Married', 'Widowed', 'Separated', 'Divorced'],
            placeholder: 'Select civil status',
          })}
          {renderSelect({
            id: 'mother-employment-status',
            label: 'Employment Status',
            name: 'employmentStatus',
            options: ['Part-Time', 'Full-Time', 'Housewife', 'Looking for Employment', 'Other'],
            placeholder: 'Select employment status',
          })}
          {renderSelect({
            id: 'mother-education',
            label: 'Educational Attainment',
            name: 'educationalAttainment',
            options: ['Elementary', 'High School', 'College', 'Post-Graduate', 'Other'],
            placeholder: 'Select educational attainment',
          })}
          </div>

        </section>

        <section className="create-mother-category">
          <h4 className="form-section-title">I.B ADDRESS DETAILS</h4>
          <div className="form-row-3 full-width">
          {renderSelect({
            id: 'mother-province',
            label: 'Province',
            name: 'province',
            options: locationOptions?.PHILIPPINE_PROVINCES || [],
            placeholder: locationLoadError ? 'Location options unavailable' : locationOptions ? 'Select province' : 'Loading provinces…',
            required: true,
            onChange: (value) => setForm((prev) => ({ ...prev, province: value, city: '', barangay: '' })),
          })}
          {renderSelect({
            id: 'mother-city',
            label: 'City / Municipality',
            name: 'city',
            options: cityOptions,
            placeholder: locationLoadError
              ? 'Location options unavailable'
              : locationOptions
                ? (form.province ? 'Select city / municipality' : 'Select province first')
                : 'Loading cities…',
            required: true,
            onChange: (value) => setForm((prev) => ({ ...prev, city: value, barangay: '' })),
            disabled: !form.province || !locationOptions,
          })}
          {renderSelect({
            id: 'mother-barangay',
            label: 'Barangay',
            name: 'barangay',
            options: barangayOptions,
            placeholder: barangaysLoading ? 'Loading barangays…' : (form.city ? 'Select barangay' : 'Select city first'),
            required: true,
            disabled: !form.city || barangaysLoading,
          })}
          </div>
          {(locationLoadError || barangaysLoadError) && (
            <p className="error-message" role="alert">{locationLoadError || barangaysLoadError}</p>
          )}
        </section>

        <section className="create-mother-category">
          <h4 className="form-section-title">I.C COMMUNITY DETAILS</h4>
          <div className="form-row-3 full-width">
          {!hideSchoolField && renderSelect({
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
            required: true,
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
            required: true,
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

        {!readOnly && (
          <section className="create-mother-category">
            <h4 className="form-section-title">I.C DOCUMENTS</h4>
            <div className="document-upload-grid create-mother-document-grid">
              <div className="document-upload-field">
                <label className="form-label" htmlFor="mother-birth-certificate">Mother's Birth Certificate</label>
                <input
                  id="mother-birth-certificate"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(event) => setDocumentFiles?.((current) => ({ ...current, birthCertificate: event.target.files?.[0] || null }))}
                />
              </div>
              <div className="document-upload-field">
                <label className="form-label" htmlFor="mother-consent">Program Consent Form</label>
                <input
                  id="mother-consent"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(event) => setDocumentFiles?.((current) => ({ ...current, consent: event.target.files?.[0] || null }))}
                />
              </div>
              <div className="form-checkboxes-grid full-width">
                {[
                  ['dataPrivacySigned', 'Data privacy consent signed'],
                  ['mediaReleaseSigned', 'Media release signed'],
                ].map(([field, label]) => (
                  <label key={field} className="form-checkbox-label">
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      checked={!!form[field]}
                      onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.checked }))}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>
        )}

        {readOnly && documentContent}

        <section className="create-mother-category">
          <h4 className="form-section-title">I.D EMERGENCY CONTACT</h4>
          <div className="form-row-3 full-width">
          {renderField({ id: 'emergency-name', label: 'Name', name: 'emergencyName', placeholder: 'Enter contact name', required: true })}
          {renderField({ id: 'emergency-contact', label: 'Contact Number', name: 'emergencyContact', type: 'tel', placeholder: 'Enter contact number', required: true })}
          {renderField({ id: 'emergency-relationship', label: 'Relationship', name: 'emergencyRelationship', placeholder: 'e.g. husband', required: true })}
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
            required: true,
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
          <div className="form-row-2 full-width">
          {readOnly ? (
            renderField({ id: 'mother-lmp', label: 'Date of LMP', name: 'lmpDate', type: 'date', required: true })
          ) : (
            <div className="form-group">
              <label className="form-label" htmlFor="mother-lmp">Date of LMP</label>
              <input
                id="mother-lmp"
                type={slashDateInput ? 'text' : 'date'}
                className="form-input"
                placeholder="DD/MM/YYYY"
                value={getDateDisplayValue('lmpDate', form.lmpDate)}
                onChange={(e) => updateDateValue('lmpDate', e.target.value, handleLmpChange)}
                onBlur={() => commitDateValue('lmpDate', getDateDisplayValue('lmpDate', form.lmpDate), handleLmpChange)}
                max={new Date().toISOString().split('T')[0]}
                autoComplete="off"
                pattern="\\d{2}/\\d{2}/\\d{4}"
                required
              />
              {slashDateInput && <>
                <button type="button" className="date-picker-button" onClick={() => openDatePicker('lmpDate')} aria-label="Open calendar for Date of LMP"><span aria-hidden="true">▣</span></button>
                <input
                  ref={(element) => { datePickerRefs.current.lmpDate = element; }}
                  className="native-date-picker-input"
                  type="date"
                  value={formatDateForInput(form.lmpDate)}
                  onChange={(e) => {
                    setDateDrafts((prev) => ({ ...prev, lmpDate: maskDateInput(e.target.value) }));
                    handleLmpChange(e.target.value);
                  }}
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </>}
            </div>
          )}

          {renderField({ id: 'mother-edd', label: "Expected Delivery Date (EDD)", name: 'eddDate', type: 'date', required: true, disabled: true })}
          </div>

          <div className="form-row-3 full-width">
          {renderField({ id: 'prenatal-reg-date', label: 'Date of First Prenatal Check-up', name: 'prenatalRegDate', type: 'date' })}
          {renderField({ id: 'prenatal-gest-age', label: 'Gestational Age at Reg (weeks)', name: 'gestationalAge', required: true, disabled: true })}
          {renderField({ id: 'mother-trimester', label: 'Trimester', name: 'trimester', required: true, disabled: true })}
          </div>

          <div className="form-row-3 full-width">
          {renderField({ id: 'prenatal-weight', label: 'Weight (kg) at Reg', name: 'prenatalWeight', placeholder: 'e.g. 52', required: true })}
          {renderField({ id: 'prenatal-bp', label: 'Blood Pressure (BP) at Reg', name: 'prenatalBp', placeholder: 'e.g. 120/80', required: true })}
          {renderField({ id: 'prenatal-height', label: 'Height (cm) at Reg', name: 'prenatalHeight', placeholder: 'e.g. 150', required: true })}
          </div>
          <div className="form-row-2 full-width">
            <div className="form-group">
              <label className="form-label">Initial BMI</label>
              <div className="form-readonly-value">{prenatalBmi}</div>
            </div>
            <div className="form-group">
              <label className="form-label">Nutritional Status (BMI)</label>
              <div className="form-readonly-value">{prenatalBmiStatus}</div>
            </div>
          </div>
        </section>

        <section className="create-mother-category">
          <h4 className="form-section-title">III. NUMBER OF PREGNANCIES & BIRTHS (OB)</h4>
          <div className="form-row-3 full-width">
          {renderField({ id: 'ob-gravida', label: 'Gravida (Pregnancies)', name: 'gravida', type: 'number', placeholder: 'Total pregnancies', required: true, minValue: 0 })}
          {renderField({ id: 'ob-abortion', label: 'Abortion', name: 'abortion', type: 'number', placeholder: 'Spontaneous/induced', required: true, minValue: 0 })}
          {renderField({ id: 'ob-stillbirth', label: 'Stillbirth', name: 'stillbirth', type: 'number', placeholder: 'Fetal death >20wks', required: true, minValue: 0 })}
          </div>
          <div className="form-row-4 full-width">
          {renderField({ id: 'ob-total-children', label: 'Total Children', name: 'totalChildren', type: 'number', minValue: 0, placeholder: '0' })}
          {renderField({ id: 'ob-born-alive', label: 'Children Born Alive', name: 'childrenBornAlive', type: 'number', minValue: 0, placeholder: '0' })}
          {renderField({ id: 'ob-miscarriages', label: 'Miscarriages', name: 'miscarriages', type: 'number', minValue: 0, placeholder: '0' })}
          {renderField({ id: 'ob-died-after-birth', label: 'Children Born Alive but Now Deceased', name: 'childrenDiedAfterBirth', type: 'number', minValue: 0, placeholder: '0' })}
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
      { key: 'parasitism', label: 'Parasitism' },
      { key: 'anemia', label: 'Anemia' },
      { key: 'urinaryTractInfection', label: 'Urinary Tract Infection' },
      { key: 'genitalTractInfection', label: 'Genital Tract Infection' },
      { key: 'smoking', label: 'Smoking' },
      { key: 'alcoholIntake', label: 'Alcohol Intake' },
      { key: 'illegalDrugUse', label: 'Illegal Drug Use' },
      { key: 'otherInfectiousDisease', label: 'Other Infectious Disease' },
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
        </section>
      </div>
    );
  }

  if (activeTab === 'vaccine') {
    return (
      <div className="create-mother-general create-mother-vaccine">
        <section className="create-mother-category">
          <h4 className="form-section-title">IV.C VACCINE RECORD</h4>
          <p className="form-optional-note">Optional</p>
          <div className="form-group full-width">
          <div className="form-panel vaccine-form-panel">
            <div className="vaccine-form-table-wrapper">
              <table className="vaccine-form-table">
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>Vaccine</th>
                    {[1, 2, 3].map((num) => (
                      <th key={num} style={{ width: '14%' }}>Dose {num}</th>
                    ))}
                    <th style={{ width: '38%' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Tetanus Toxoid (TT)</strong></td>
                    {[1, 2, 3].map((num) => (
                      <td key={num}>
                        {readOnly ? (
                          <div className="form-readonly-value">{form[`tt${num}Date`] || '-'}</div>
                        ) : (
                          <>
                            <input
                              type={slashDateInput ? 'text' : 'date'}
                              className="form-input table-input"
                              placeholder={slashDateInput ? 'DD/MM/YYYY' : undefined}
                              aria-label={`TT dose ${num} date`}
                              value={getDateDisplayValue(`tt${num}Date`, form[`tt${num}Date`] || '')}
                              onChange={(e) => updateDateValue(`tt${num}Date`, e.target.value)}
                              onBlur={() => commitDateValue(`tt${num}Date`, getDateDisplayValue(`tt${num}Date`, form[`tt${num}Date`] || ''))}
                              autoComplete="off"
                            />
                            {slashDateInput && <>
                              <button type="button" className="date-picker-button" onClick={() => openDatePicker(`tt${num}Date`)} aria-label={`Open calendar for TT dose ${num}`}><span aria-hidden="true">▣</span></button>
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
                    ))}
                    <td>
                      {readOnly ? (
                        <div className="form-readonly-value">{form.ttRemarks || [1, 2, 3, 4, 5].map((num) => form[`tt${num}Remarks`]).filter(Boolean).join('; ') || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          className="form-input table-input"
                          aria-label="Tetanus Toxoid remarks"
                          placeholder="Remarks..."
                          value={form.ttRemarks ?? ''}
                          onChange={(e) => setForm((prev) => ({ ...prev, ttRemarks: e.target.value }))}
                        />
                      )}
                    </td>
                  </tr>
                  {OTHER_MATERNAL_VACCINES.map(({ label, key }) => (
                    <tr key={key}>
                      <td><strong>{label}</strong></td>
                      {[1, 2, 3].map((num) => {
                        const dateField = `${key}${num === 1 ? 'Date' : `Dose${num}Date`}`;
                        return (
                          <td key={dateField}>
                            {readOnly ? (
                              <div className="form-readonly-value">{getDateDisplayValue(dateField, form[dateField] || '') || '—'}</div>
                            ) : (
                              <input
                                type={slashDateInput ? 'text' : 'date'}
                                className="form-input table-input"
                                placeholder={slashDateInput ? 'DD/MM/YYYY' : undefined}
                                aria-label={`${label} dose ${num} date`}
                                value={getDateDisplayValue(dateField, form[dateField] || '')}
                                onChange={(event) => updateDateValue(dateField, event.target.value)}
                                onBlur={() => commitDateValue(dateField, getDateDisplayValue(dateField, form[dateField] || ''))}
                                autoComplete="off"
                              />
                            )}
                          </td>
                        );
                      })}
                      <td>
                        {readOnly ? (
                          <div className="form-readonly-value">{form[`${key}Remarks`] || '—'}</div>
                        ) : (
                          <input
                            type="text"
                            className="form-input table-input"
                            aria-label={`${label} source or facility`}
                            placeholder="Source / facility"
                            value={form[`${key}Remarks`] || ''}
                            onChange={(event) => setForm((current) => ({ ...current, [`${key}Remarks`]: event.target.value }))}
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
