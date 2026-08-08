import React from 'react';

export function MotherFormFields({
  activeTab,
  form,
  setForm,
  communities = [],
  groups = [],
  batches = []
}) {
  const uniqueCommunities = Array.from(new Set(communities.map((comm) => comm.name))).filter(Boolean);

  const handleLmpChange = (val) => {
    setForm((prev) => {
      const newForm = { ...prev, lmpDate: val };
      if (val) {
        const lmp = new Date(val);
        if (!isNaN(lmp.getTime())) {
          const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
          newForm.eddDate = edd.toISOString().split('T')[0];
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

  if (activeTab === 'general') {
    return (
      <>
        <h4 className="form-section-title">I.A Mother's Information</h4>
        <div className="form-row-4 full-width name-row">
          <div className="form-group">
            <label className="form-label" htmlFor="mother-first-name">First Name</label>
            <input
              id="mother-first-name"
              type="text"
              className="form-input"
              placeholder="First name"
              value={form.firstName || ''}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mother-middle-name">Middle Name</label>
            <input
              id="mother-middle-name"
              type="text"
              className="form-input"
              placeholder="Middle name"
              value={form.middleName || ''}
              onChange={(e) => setForm({ ...form, middleName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mother-last-name">Last Name</label>
            <input
              id="mother-last-name"
              type="text"
              className="form-input"
              placeholder="Last name"
              value={form.lastName || ''}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mother-suffix">Suffix</label>
            <input
              id="mother-suffix"
              type="text"
              className="form-input"
              placeholder="Suffix"
              value={form.suffix || ''}
              onChange={(e) => setForm({ ...form, suffix: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row-3 full-width">
          <div className="form-group">
            <label className="form-label" htmlFor="mother-id">Mother ID</label>
            <input
              id="mother-id"
              type="text"
              className="form-input"
              placeholder="Enter mother's ID"
              value={form.motherId || ''}
              onChange={(e) => setForm({ ...form, motherId: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mother-dob">Date of Birth</label>
            <input
              id="mother-dob"
              type="date"
              className="form-input"
              value={form.dob || ''}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mother-contact">Contact Number</label>
            <input
              id="mother-contact"
              type="tel"
              className="form-input"
              placeholder="0917******"
              value={form.contactNumber || ''}
              onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row-4 full-width">
          <div className="form-group">
            <label className="form-label" htmlFor="mother-lmp">Date of LMP</label>
            <input
              id="mother-lmp"
              type="date"
              className="form-input"
              value={form.lmpDate || ''}
              onChange={(e) => handleLmpChange(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mother-edd">Expected Delivery Date (EDD)</label>
            <input
              id="mother-edd"
              type="date"
              className="form-input"
              value={form.eddDate || ''}
              onChange={(e) => setForm({ ...form, eddDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mother-weight">Mother's Weight (kg)</label>
            <input
              id="mother-weight"
              type="text"
              className="form-input"
              placeholder="e.g. 50 kg"
              value={form.weight || ''}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mother-height">Mother's Height (cm)</label>
            <input
              id="mother-height"
              type="text"
              className="form-input"
              placeholder="e.g. 150 cm"
              value={form.height || ''}
              onChange={(e) => setForm({ ...form, height: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row-3 full-width">
          <div className="form-group">
            <label className="form-label" htmlFor="mother-high-risk">Is High Risk?</label>
            <select
              id="mother-high-risk"
              className="form-select"
              value={form.isHighRisk || 'No'}
              onChange={(e) => setForm({ ...form, isHighRisk: e.target.value })}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mother-program">Program Type</label>
            <select
              id="mother-program"
              className="form-select"
              value={form.programType || 'Maternal Health Program'}
              onChange={(e) => setForm({ ...form, programType: e.target.value })}
            >
              <option value="Maternal Health Program">Maternal Health Program</option>
              <option value="High Risk Maternal Support">High Risk Maternal Support</option>
              <option value="New Mother Care">New Mother Care</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="mother-area">Area</label>
            <select
              id="mother-area"
              className="form-select"
              value={form.area || 'Poblacion'}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
            >
              <option value="Poblacion">Poblacion</option>
              <option value="Upland">Upland</option>
              <option value="Downtown">Downtown</option>
              <option value="Coastal">Coastal</option>
              <option value="Highland">Highland</option>
              <option value="Lowland">Lowland</option>
              <option value="Riverside">Riverside</option>
              <option value="Forest">Forest</option>
            </select>
          </div>
        </div>

        <h4 className="form-section-title">I.B EMERGENCY CONTACT DETAILS</h4>
        <div className="form-row-3 full-width">
          <div className="form-group">
            <label className="form-label" htmlFor="emergency-name">Name</label>
            <input
              id="emergency-name"
              type="text"
              className="form-input"
              placeholder="Enter contact name"
              value={form.emergencyName || ''}
              onChange={(e) => setForm({ ...form, emergencyName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="emergency-contact">Contact Number</label>
            <input
              id="emergency-contact"
              type="tel"
              className="form-input"
              placeholder="Enter contact number"
              value={form.emergencyContact || ''}
              onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="emergency-relationship">Relationship</label>
            <input
              id="emergency-relationship"
              type="text"
              className="form-input"
              placeholder="e.g. husband"
              value={form.emergencyRelationship || ''}
              onChange={(e) => setForm({ ...form, emergencyRelationship: e.target.value })}
            />
          </div>
        </div>

        <h4 className="form-section-title">I.C OTHER DETAILS</h4>
        <div className="form-group full-width">
          <label className="form-label" htmlFor="spouse-name">Spouse Name</label>
          <input
            id="spouse-name"
            type="text"
            className="form-input"
            placeholder="Enter spouse name"
            value={form.spouseName || ''}
            onChange={(e) => setForm({ ...form, spouseName: e.target.value })}
            style={{ maxWidth: '400px' }}
          />
        </div>
        <div className="form-group full-width">
          <label className="form-label" htmlFor="mother-address">Address</label>
          <textarea
            id="mother-address"
            className="form-input"
            rows="3"
            placeholder="Enter address..."
            value={form.address || ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
      </>
    );
  }

  if (activeTab === 'prenatal') {
    return (
      <>
        <h4 className="form-section-title">II. INITIAL PRENATAL ASSESSMENT & MATERNAL HEALTH PROFILE</h4>
        <div className="form-row-3 full-width">
          <div className="form-group">
            <label className="form-label" htmlFor="prenatal-reg-date">Date of Prenatal Registration</label>
            <input
              id="prenatal-reg-date"
              type="date"
              className="form-input"
              value={form.prenatalRegDate || ''}
              onChange={(e) => setForm({ ...form, prenatalRegDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="prenatal-trimester">Trimester at Registration</label>
            <select
              id="prenatal-trimester"
              className="form-select"
              value={form.trimester || '1st Trimester'}
              onChange={(e) => setForm({ ...form, trimester: e.target.value })}
            >
              <option value="1st Trimester">1st Trimester</option>
              <option value="2nd Trimester">2nd Trimester</option>
              <option value="3rd Trimester">3rd Trimester</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="prenatal-gest-age">Gestational Age at Reg (weeks)</label>
            <input
              id="prenatal-gest-age"
              type="text"
              className="form-input"
              placeholder="e.g. 12"
              value={form.gestationalAge || ''}
              onChange={(e) => setForm({ ...form, gestationalAge: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row-3 full-width">
          <div className="form-group">
            <label className="form-label" htmlFor="prenatal-weight">Weight (kg) at Reg</label>
            <input
              id="prenatal-weight"
              type="text"
              className="form-input"
              placeholder="e.g. 52"
              value={form.prenatalWeight || ''}
              onChange={(e) => setForm({ ...form, prenatalWeight: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="prenatal-bp">Blood Pressure (BP) at Reg</label>
            <input
              id="prenatal-bp"
              type="text"
              className="form-input"
              placeholder="e.g. 120/80"
              value={form.prenatalBp || ''}
              onChange={(e) => setForm({ ...form, prenatalBp: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="prenatal-height">Height (cm) at Reg</label>
            <input
              id="prenatal-height"
              type="text"
              className="form-input"
              placeholder="e.g. 150"
              value={form.prenatalHeight || ''}
              onChange={(e) => setForm({ ...form, prenatalHeight: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row-3 full-width">
          <div className="form-group">
            <label className="form-label" htmlFor="prenatal-fundal">Fundal Height (cm) at Reg</label>
            <input
              id="prenatal-fundal"
              type="text"
              className="form-input"
              placeholder="e.g. 15"
              value={form.fundalHeight || ''}
              onChange={(e) => setForm({ ...form, fundalHeight: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="prenatal-fhr">FHR (bpm) at Reg</label>
            <input
              id="prenatal-fhr"
              type="text"
              className="form-input"
              placeholder="e.g. 145"
              value={form.fhr || ''}
              onChange={(e) => setForm({ ...form, fhr: e.target.value })}
            />
          </div>
          <div className="form-group" aria-hidden="true" />
        </div>

        <h4 className="form-section-title">III. NUMBER OF PREGNANCIES & BIRTHS (OB)</h4>
        <div className="form-row-4 full-width">
          <div className="form-group">
            <label className="form-label" htmlFor="ob-gravida">Gravida (Pregnancies)</label>
            <input
              id="ob-gravida"
              type="number"
              min="0"
              className="form-input"
              placeholder="Total pregnancies"
              value={form.gravida || ''}
              onChange={(e) => setForm({ ...form, gravida: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="ob-para">Para (Completed >20wks)</label>
            <input
              id="ob-para"
              type="number"
              min="0"
              className="form-input"
              placeholder="Completed pregnancies"
              value={form.para || ''}
              onChange={(e) => setForm({ ...form, para: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="ob-abortion">Abortion</label>
            <input
              id="ob-abortion"
              type="number"
              min="0"
              className="form-input"
              placeholder="Spontaneous/induced"
              value={form.abortion || ''}
              onChange={(e) => setForm({ ...form, abortion: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="ob-stillbirth">Stillbirth</label>
            <input
              id="ob-stillbirth"
              type="number"
              min="0"
              className="form-input"
              placeholder="Fetal death >20wks"
              value={form.stillbirth || ''}
              onChange={(e) => setForm({ ...form, stillbirth: e.target.value })}
            />
          </div>
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
                      <input
                        type="text"
                        className="form-input table-input"
                        placeholder="e.g. 38 weeks"
                        value={row.gestationalAge || ''}
                        onChange={(e) => handleObHistoryChange(index, 'gestationalAge', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input table-input"
                        placeholder="e.g. Normal Vaginal Delivery"
                        value={row.outcome || ''}
                        onChange={(e) => handleObHistoryChange(index, 'outcome', e.target.value)}
                      />
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
        <div className="form-group full-width">
          <label className="form-label" htmlFor="other-medical-notes">Other Medical History</label>
          <textarea
            id="other-medical-notes"
            className="form-input"
            rows="2"
            placeholder="Other medical history notes..."
            value={form.otherMedicalHistory || ''}
            onChange={(e) => setForm({ ...form, otherMedicalHistory: e.target.value })}
          />
        </div>

        <h4 className="form-section-title">IV.B DENTAL HEALTH CONDITION</h4>
        <div className="form-row-3 full-width">
          <div className="form-group">
            <label className="form-label" htmlFor="dental-date">Date of Dental Check-up</label>
            <input
              id="dental-date"
              type="date"
              className="form-input"
              value={form.dentalCheckupDate || ''}
              onChange={(e) => setForm({ ...form, dentalCheckupDate: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="dental-facility">Dental Clinic / Health Facility</label>
            <input
              id="dental-facility"
              type="text"
              className="form-input"
              placeholder="Facility name"
              value={form.dentalFacility || ''}
              onChange={(e) => setForm({ ...form, dentalFacility: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="dentist-charge">Dentist in Charge</label>
            <input
              id="dentist-charge"
              type="text"
              className="form-input"
              placeholder="Dentist name"
              value={form.dentistInCharge || ''}
              onChange={(e) => setForm({ ...form, dentistInCharge: e.target.value })}
            />
          </div>
        </div>

        <div className="form-row-3 full-width">
          <div className="form-group">
            <label className="form-label" htmlFor="dentist-comm">Community Dentist Name</label>
            <input
              id="dentist-comm"
              type="text"
              className="form-input"
              placeholder="Community dentist"
              value={form.communityDentist || ''}
              onChange={(e) => setForm({ ...form, communityDentist: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="dentist-license">Dentist License No</label>
            <input
              id="dentist-license"
              type="text"
              className="form-input"
              placeholder="License number"
              value={form.dentistLicense || ''}
              onChange={(e) => setForm({ ...form, dentistLicense: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="dentist-contact">Dentist Contact No</label>
            <input
              id="dentist-contact"
              type="tel"
              className="form-input"
              placeholder="Contact number"
              value={form.dentistContact || ''}
              onChange={(e) => setForm({ ...form, dentistContact: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group narrow-field">
          <label className="form-label" htmlFor="teeth-count">Number of Teeth Pregnant</label>
          <input
            id="teeth-count"
            type="number"
            min="0"
            className="form-input"
            placeholder="e.g. 28"
            value={form.teethCount || ''}
            onChange={(e) => setForm({ ...form, teethCount: e.target.value })}
          />
        </div>

        <div className="form-group full-width">
          <label className="form-label" htmlFor="dental-findings">Dental Findings / Diagnosis</label>
          <textarea
            id="dental-findings"
            className="form-input"
            rows="2"
            placeholder="Findings or diagnosis..."
            value={form.dentalFindings || ''}
            onChange={(e) => setForm({ ...form, dentalFindings: e.target.value })}
          />
        </div>

        <div className="form-group full-width">
          <label className="form-label">Dental Work Done</label>
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
        </div>

        <div className="form-group full-width">
          <label className="form-label" htmlFor="dental-remarks">Remarks / Recommendations</label>
          <textarea
            id="dental-remarks"
            className="form-input"
            rows="2"
            placeholder="Dental recommendations..."
            value={form.dentalRemarks || ''}
            onChange={(e) => setForm({ ...form, dentalRemarks: e.target.value })}
          />
        </div>
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
                      <input
                        type="date"
                        className="form-input table-input"
                        value={form[`tt${num}Date`] || ''}
                        onChange={(e) => setForm({ ...form, [`tt${num}Date`]: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input table-input"
                        placeholder="Remarks..."
                        value={form[`tt${num}Remarks`] || ''}
                        onChange={(e) => setForm({ ...form, [`tt${num}Remarks`]: e.target.value })}
                      />
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
