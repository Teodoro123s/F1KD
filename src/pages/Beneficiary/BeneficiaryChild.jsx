import React from 'react';

export function ChildFormFields({
  activeTab,
  form,
  setForm,
  communities = [],
  batches = []
}) {
  const availableBatches = batches.filter((batch) => batch.community === form.community);

  const handleCheckboxChange = (section, key, checked) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [key]: checked,
      },
    }));
  };

  if (activeTab === 'general') {
    return (
      <>
        <h4 className="form-section-title">Child Information</h4>
        <div className="form-group narrow-field">
          <label className="form-label" htmlFor="child-mother">Select Mother</label>
          <select
            id="child-mother"
            className="form-select"
            value={form.community || ''}
            onChange={(e) => setForm({ ...form, community: e.target.value })}
            required
          >
            <option value="">Select mother</option>
            {communities.map((comm) => (
              <option key={comm.id} value={comm.name}>{comm.name}</option>
            ))}
          </select>
        </div>

        <div className="form-row-4 full-width name-row">
          <div className="form-group">
            <label className="form-label" htmlFor="child-first-name">First name</label>
            <input
              id="child-first-name"
              type="text"
              className="form-input"
              placeholder="First name"
              value={form.firstName || ''}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="child-middle-name">Middle name</label>
            <input
              id="child-middle-name"
              type="text"
              className="form-input"
              placeholder="Middle name"
              value={form.middleName || ''}
              onChange={(e) => setForm({ ...form, middleName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="child-last-name">Surname</label>
            <input
              id="child-last-name"
              type="text"
              className="form-input"
              placeholder="Surname"
              value={form.lastName || ''}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="child-suffix">Suffix</label>
            <input
              id="child-suffix"
              type="text"
              className="form-input"
              placeholder="Suffix"
              value={form.suffix || ''}
              onChange={(e) => setForm({ ...form, suffix: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row-4 full-width">
          <div className="form-group">
            <label className="form-label" htmlFor="child-birth-date">Birth date</label>
            <input
              id="child-birth-date"
              type="date"
              className="form-input"
              value={form.birthDate || ''}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="child-gender">Gender</label>
            <select
              id="child-gender"
              className="form-select"
              value={form.gender || ''}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              required
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="child-birth-weight">Birth weight</label>
            <input
              id="child-birth-weight"
              type="text"
              className="form-input"
              placeholder="e.g. 3.2 kg"
              value={form.birthWeight || ''}
              onChange={(e) => setForm({ ...form, birthWeight: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="child-birth-length">Birth length</label>
            <input
              id="child-birth-length"
              type="text"
              className="form-input"
              placeholder="e.g. 51 cm"
              value={form.birthLength || ''}
              onChange={(e) => setForm({ ...form, birthLength: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row-3 full-width">
          <div className="form-group">
            <label className="form-label" htmlFor="child-community">Community</label>
            <input
              id="child-community"
              type="text"
              className="form-input"
              value={form.community || ''}
              readOnly
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="child-batch">Batch</label>
            <select
              id="child-batch"
              className="form-select"
              value={form.batch || ''}
              onChange={(e) => setForm({ ...form, batch: e.target.value })}
            >
              <option value="">Select batch</option>
              {availableBatches.map((batch) => (
                <option key={batch.id} value={batch.name}>{batch.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" aria-hidden="true" />
        </div>
      </>
    );
  }

  if (activeTab === 'prenatal') {
    return (
      <>
        <h4 className="form-section-title">Birth & Delivery Details</h4>
        <div className="form-row-3 full-width">
          <div className="form-group">
            <label className="form-label" htmlFor="child-delivery-type">Delivery type</label>
            <select
              id="child-delivery-type"
              className="form-select"
              value={form.deliveryType || ''}
              onChange={(e) => setForm({ ...form, deliveryType: e.target.value })}
            >
              <option value="">Select delivery type</option>
              <option value="Vaginal">Vaginal</option>
              <option value="Cesarean">Cesarean</option>
              <option value="Assisted">Assisted</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="child-health-status">Health status</label>
            <select
              id="child-health-status"
              className="form-select"
              value={form.healthStatus || ''}
              onChange={(e) => setForm({ ...form, healthStatus: e.target.value })}
            >
              <option value="">Select health status</option>
              <option value="Healthy">Healthy</option>
              <option value="Needs Follow-up">Needs Follow-up</option>
              <option value="At Risk">At Risk</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="child-birth-place">Place of birth</label>
            <input
              id="child-birth-place"
              type="text"
              className="form-input"
              placeholder="e.g. Clinic / Home"
              value={form.birthPlace || ''}
              onChange={(e) => setForm({ ...form, birthPlace: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row-3 full-width">
          <div className="form-group">
            <label className="form-label" htmlFor="child-birth-attendant">Birth attendant</label>
            <input
              id="child-birth-attendant"
              type="text"
              className="form-input"
              placeholder="e.g. Midwife"
              value={form.birthAttendant || ''}
              onChange={(e) => setForm({ ...form, birthAttendant: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="child-apgar-score">Apgar score</label>
            <input
              id="child-apgar-score"
              type="number"
              min="0"
              max="10"
              className="form-input"
              value={form.apgarScore || ''}
              onChange={(e) => setForm({ ...form, apgarScore: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="child-feeding-type">Feeding type</label>
            <select
              id="child-feeding-type"
              className="form-select"
              value={form.feedingType || ''}
              onChange={(e) => setForm({ ...form, feedingType: e.target.value })}
            >
              <option value="">Select feeding type</option>
              <option value="Breastfeeding">Breastfeeding</option>
              <option value="Formula">Formula</option>
              <option value="Mixed">Mixed</option>
            </select>
          </div>
        </div>

        <div className="form-group full-width">
          <label className="form-label" htmlFor="child-nutrition-notes">Nutrition notes</label>
          <textarea
            id="child-nutrition-notes"
            className="form-input"
            rows="2"
            placeholder="Describe feeding or nutrition concerns"
            value={form.nutritionNotes || ''}
            onChange={(e) => setForm({ ...form, nutritionNotes: e.target.value })}
          />
        </div>
      </>
    );
  }

  if (activeTab === 'medical_dental') {
    const conditionKeys = [
      { key: 'congenitalHeartDisease', label: 'Congenital Heart Disease' },
      { key: 'respiratoryIssues', label: 'Respiratory Issues' },
      { key: 'prematurity', label: 'Prematurity' },
      { key: 'jaundice', label: 'Jaundice' },
      { key: 'anemia', label: 'Anemia' },
      { key: 'growthDelay', label: 'Growth Delay' },
    ];

    return (
      <>
        <h4 className="form-section-title">Medical & Dental Screening</h4>
        <div className="form-checkboxes-grid full-width">
          {conditionKeys.map(({ key, label }) => (
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
        <div className="form-group full-width">
          <label className="form-label" htmlFor="child-medical-remarks">Medical remarks</label>
          <textarea
            id="child-medical-remarks"
            className="form-input"
            rows="2"
            placeholder="Any medical or dental notes"
            value={form.medicalRemarks || ''}
            onChange={(e) => setForm({ ...form, medicalRemarks: e.target.value })}
          />
        </div>
      </>
    );
  }

  if (activeTab === 'vaccine') {
    const vaccines = [
      { key: 'bcg', label: 'BCG' },
      { key: 'hepb', label: 'Hepatitis B' },
      { key: 'opv', label: 'OPV' },
      { key: 'dpt', label: 'DPT' },
      { key: 'mmr', label: 'MMR' },
    ];

    return (
      <>
        <h4 className="form-section-title">Vaccine Record</h4>
        <div className="vaccine-form-table-wrapper">
          <table className="vaccine-form-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Vaccine</th>
                <th style={{ width: '35%' }}>Date Given</th>
                <th style={{ width: '35%' }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {vaccines.map(({ key, label }) => (
                <tr key={key}>
                  <td><strong>{label}</strong></td>
                  <td>
                    <input
                      type="date"
                      className="form-input table-input"
                      value={form[`${key}Date`] || ''}
                      onChange={(e) => setForm({ ...form, [`${key}Date`]: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-input table-input"
                      placeholder="Remarks..."
                      value={form[`${key}Remarks`] || ''}
                      onChange={(e) => setForm({ ...form, [`${key}Remarks`]: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return null;
}
