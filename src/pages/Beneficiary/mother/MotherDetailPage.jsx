import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateForDisplay } from '../../../utils/dateFormat';
import { apiUploadMotherDocuments } from '../../../api/mothers';

const calculateAge = (dobString) => {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const formatLabelValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
};

const getListValues = (obj = {}) =>
  Object.entries(obj)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => key)
    .map((key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (ch) => ch.toUpperCase()));

const Field = ({ label, value, className = '' }) => (
  <div className={`detail-form-field ${className}`}>
    <div className="detail-form-label">{label}</div>
    <div className={`detail-form-value ${value === null || value === undefined || value === '' || value === '—' ? 'empty' : ''}`}>
      {formatLabelValue(value)}
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <section className="mother-detail-section">
    <h3 className="mother-detail-section-title">{title}</h3>
    <div className="mother-detail-grid">{children}</div>
  </section>
);

const ChipList = ({ items, emptyLabel = 'None' }) => {
  if (!items || items.length === 0) {
    return <div className="mother-detail-empty">{emptyLabel}</div>;
  }

  return (
    <div className="mother-detail-chip-list">
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="mother-detail-chip">{item}</span>
      ))}
    </div>
  );
};

export default function MotherDetailPage({ selectedMother, onClose }) {
  const navigate = useNavigate();
  const [motherRecord, setMotherRecord] = useState(selectedMother);
  const [uploadingDocument, setUploadingDocument] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  if (!selectedMother) return null;

  const children = Array.isArray(selectedMother.children) ? selectedMother.children : [];
  const hasMultipleChildren = children.length > 1;
  const childBadge = (child) => {
    const value = child?.multipleBirthType || child?.multiple_birth_type;
    return value ? `[${value}]` : null;
  };

  const fullName = selectedMother.name || `${selectedMother.firstName || ''} ${selectedMother.middleName || ''} ${selectedMother.lastName || ''} ${selectedMother.suffix || ''}`.replace(/\s+/g, ' ').trim();
  const motherId = selectedMother.motherId || selectedMother.id || 'M-unknown';
  const age = calculateAge(selectedMother.dob);

  const firstName = selectedMother.firstName || '—';
  const middleName = selectedMother.middleName || '—';
  const lastName = selectedMother.lastName || '—';
  const suffix = selectedMother.suffix || '—';
  const dob = formatDateForDisplay(selectedMother.dob);
  const contact = selectedMother.contactNumber || selectedMother.contact || '—';
  const address = selectedMother.address || selectedMother.currentAddress || selectedMother.area || selectedMother.community || '—';
  const area = selectedMother.area || '—';
  const community = selectedMother.community || '—';
  const group = selectedMother.group || '—';
  const batch = selectedMother.batch || '—';
  const highRisk = selectedMother.isHighRisk ?? selectedMother.is_high_risk ?? 'No';
  const program = selectedMother.programType || selectedMother.program || 'Maternal Health Program';

  const emergencyName = selectedMother.emergencyName || '—';
  const emergencyContact = selectedMother.emergencyContact || '—';
  const emergencyRelationship = selectedMother.emergencyRelationship || '—';
  const spouseName = selectedMother.spouseName || '—';

  const weight = selectedMother.weight || selectedMother.prenatalWeight || '—';
  const height = selectedMother.height || selectedMother.prenatalHeight || '—';
  const prenatalBp = selectedMother.prenatalBp || '—';
  const fundalHeight = selectedMother.fundalHeight || '—';
  const fhr = selectedMother.fhr || '—';
  const gravida = selectedMother.gravida ?? '—';
  const para = selectedMother.para ?? '—';
  const abortion = selectedMother.abortion ?? '—';
  const stillbirth = selectedMother.stillbirth ?? '—';
  const lmp = formatDateForDisplay(selectedMother.lmpDate || selectedMother.lmp);
  const edd = formatDateForDisplay(selectedMother.eddDate || selectedMother.edd);
  const prenatalRegDate = formatDateForDisplay(selectedMother.prenatalRegDate);
  const trimester = selectedMother.trimester || '—';
  const gestationalAge = selectedMother.gestationalAge || '—';

  const medicalConditions = selectedMother.medicalConditions || {};
  const medicalList = getListValues(medicalConditions);
  const dentalWork = selectedMother.dentalWork || {};
  const dentalList = getListValues(dentalWork);

  const obHistory = Array.isArray(selectedMother.obHistory) ? selectedMother.obHistory : [];
  const vaccineRows = [1, 2, 3, 4, 5].map((num) => ({
    vaccine: `TT${num}`,
    date: formatDateForDisplay(selectedMother[`tt${num}Date`]),
    remarks: selectedMother[`tt${num}Remarks`] || '—',
  }));

  const uploadDocument = async (field, file) => {
    if (!file) return;
    setUploadingDocument(field);
    setUploadMessage('');
    try {
      const response = await apiUploadMotherDocuments(motherId, { [field]: file });
      if (response?.mother) setMotherRecord((current) => ({ ...current, ...response.mother }));
      setUploadMessage('Document uploaded successfully.');
    } catch (error) {
      setUploadMessage(error.message || 'Unable to upload document.');
    } finally {
      setUploadingDocument('');
    }
  };

  return (
    <section className="mother-detail-page">
      <header className="mother-detail-header">
        <div className="mother-detail-identity">
          <h1 className="mother-detail-name">{fullName || 'Unnamed Mother'}</h1>
        </div>

        <div className="mother-detail-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate(`/beneficiary/mother/${motherId}/edit`, { state: { mother: selectedMother } })}>Edit</button>
          <button type="button" className="btn-secondary" onClick={() => {
            navigate(`/beneficiary/mother/${motherId}/child`, { state: { mother: selectedMother, children, returnTo: `/beneficiary/mother/${motherId}` } });
          }}>View Children</button>
          <button type="button" className="btn-primary" onClick={() => navigate('/monitoring', { state: { mother: selectedMother, returnTo: `/beneficiary/mother/${motherId}` } })}>Monitor</button>
          <button type="button" className="btn-close-profile-custom" onClick={onClose} aria-label="Close mother profile">Close</button>
        </div>
      </header>

      {hasMultipleChildren && (
        <div className="tabs-row" style={{ marginBottom: 16 }}>
          <button type="button" className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button type="button" className={`tab-button ${activeTab === 'children' ? 'active' : ''}`} onClick={() => setActiveTab('children')}>Children</button>
        </div>
      )}

      {activeTab === 'children' ? (
        <section className="mother-detail-section">
          <h3 className="mother-detail-section-title">Children</h3>
          <div className="mother-detail-grid">
            {children.map((child) => {
              const childNameValue = `${child.firstName || child.first_name || ''} ${child.middleName || child.middle_name || ''} ${child.lastName || child.last_name || ''}`.replace(/\s+/g, ' ').trim() || child.child_code || child.id;
              const badge = childBadge(child);
              return (
                <button type="button" key={child.id || `${child.motherId || motherId}-${childNameValue}`} className="entity-card-button name-cell" onClick={() => navigate(`/beneficiary/child/${child.id}`, { state: { mother: selectedMother, child, returnTo: `/beneficiary/mother/${motherId}` } })}>
                  <strong>{childNameValue}</strong>
                  <span>{formatDateForDisplay(child.birthDate || child.birth_date) || 'Birth date not recorded'}</span>
                  {badge && <span className="mother-detail-chip" style={{ marginTop: 8 }}>{badge}</span>}
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <>
          <section className="mother-detail-section">
            <h3 className="mother-detail-section-title">I.A MOTHER'S INFORMATION</h3>
            <div className="mother-detail-grid">
              <Field label="Surname Name" value={lastName} />
              <Field label="First Name" value={firstName} />
              <Field label="Middle Name" value={middleName} />
              <Field label="Suffix" value={suffix} />
              <Field label="Mother ID" value={motherId} />
              <Field label="Date of Birth" value={dob} />
              <Field label="Contact Number" value={contact} />
              <Field label="Age" value={age !== null ? `${age} yrs` : '—'} />
              <Field label="Date of LMP" value={lmp} />
              <Field label="Expected Delivery Date" value={edd} />
              <Field label="Weight (kg)" value={weight} />
              <Field label="Height (cm)" value={height} />
              <Field label="Is High Risk?" value={highRisk} />
              <Field label="Program Type" value={program} />
              <Field label="Area" value={area} />
              <Field label="Community" value={community} />
              <Field label="Group" value={group} />
              <Field label="Batch" value={batch} />
              <Field label="Address" value={address} className="full-width" />
            </div>
          </section>

          <section className="mother-detail-section">
            <h3 className="mother-detail-section-title">I.B EMERGENCY CONTACT DETAILS</h3>
            <div className="mother-detail-grid">
              <Field label="Name" value={emergencyName} />
              <Field label="Phone Number" value={emergencyContact} />
              <Field label="Relationship" value={emergencyRelationship} />
              <Field label="Spouse / Partner" value={spouseName} />
            </div>
          </section>

          <section className="mother-detail-section">
            <h3 className="mother-detail-section-title">I.C REQUIRED DOCUMENTS</h3>
            <div className="document-upload-grid">
              {[
                ['birthCertificate', "Mother's Birth Certificate", motherRecord.birthCertificateDocumentName, motherRecord.birthCertificateDocumentPath],
                ['consent', 'Program Consent Form', motherRecord.consentDocumentName, motherRecord.consentDocumentPath],
              ].map(([field, label, fileName, filePath]) => (
                <div className="document-upload-field" key={field}>
                  <label className="detail-form-label" htmlFor={`mother-document-${field}`}>{label}</label>
                  <input id={`mother-document-${field}`} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => uploadDocument(field, event.target.files?.[0])} disabled={uploadingDocument === field} />
                  {fileName ? <a href={`http://localhost:4000${filePath}`} target="_blank" rel="noreferrer">{fileName}</a> : <span className="document-upload-empty">No document uploaded</span>}
                </div>
              ))}
            </div>
            {uploadMessage && <p className="document-upload-message" role="status">{uploadMessage}</p>}
          </section>

          <section className="mother-detail-section">
            <h3 className="mother-detail-section-title">I.C OTHER DETAILS</h3>
            <div className="mother-detail-grid">
              <Field label="Weight (kg)" value={weight} />
              <Field label="Height (cm)" value={height} />
              <Field label="Blood Pressure" value={prenatalBp} />
              <Field label="Fundal Height" value={fundalHeight} />
              <Field label="FHR" value={fhr} />
              <Field label="Prenatal Weight" value={selectedMother.prenatalWeight || '—'} />
            </div>
          </section>

          <section className="mother-detail-section">
            <h3 className="mother-detail-section-title">II. INITIAL PRENATAL ASSESSMENT &amp; MATERNAL HEALTH PROFILE</h3>
            <div className="mother-detail-grid">
              <Field label="Date of Prenatal Registration" value={prenatalRegDate} />
              <Field label="Trimester at Registration" value={trimester} />
              <Field label="Gestational Age at Reg (weeks)" value={gestationalAge} />
              <Field label="Weight (kg) at Reg" value={selectedMother.prenatalWeight || '—'} />
              <Field label="Blood Pressure (BP) at Reg" value={prenatalBp} />
              <Field label="Height (cm) at Reg" value={selectedMother.prenatalHeight || '—'} />
              <Field label="Fundal Height (cm) at Reg" value={fundalHeight} />
              <Field label="FHR (bpm) at Reg" value={fhr} />
            </div>
          </section>

          <section className="mother-detail-section">
            <h3 className="mother-detail-section-title">III. NUMBER OF PREGNANCIES &amp; BIRTHS (GPA)</h3>
            <div className="mother-detail-grid">
              <Field label="Gravida (Pregnancies)" value={gravida} />
              <Field label="Para (Completed >20wks)" value={para} />
              <Field label="Abortion" value={abortion} />
              <Field label="Stillbirth" value={stillbirth} />
            </div>

            <div className="detail-form-field full-width" style={{ marginTop: '0.9rem' }}>
              <div className="detail-form-label">OB History</div>
              <div className="mother-detail-table-wrap">
                <table className="mother-detail-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Gestational Age</th>
                      <th>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obHistory.length ? obHistory.map((row, index) => (
                      <tr key={`${row.event || 'event'}-${index}`}>
                        <td>{row.event || `G${index + 1}`}</td>
                        <td>{row.gestationalAge || '—'}</td>
                        <td>{row.outcome || '—'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="3" className="mother-detail-empty-row">No obstetric history recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="mother-detail-section">
            <h3 className="mother-detail-section-title">IV.A HISTORY OF MEDICAL CONDITIONS</h3>
            <div className="detail-form-field full-width">
              <div className="detail-form-label">Medical Conditions</div>
              <ChipList items={medicalList} emptyLabel="None" />
            </div>
            <Field label="Other Medical History" value={selectedMother.otherMedicalHistory || '—'} className="full-width" />
          </section>

          <section className="mother-detail-section">
            <h3 className="mother-detail-section-title">IV.B ORAL HEALTH CONDITION</h3>
            <div className="mother-detail-grid">
              <Field label="Date of Dental Check-up" value={formatDateForDisplay(selectedMother.dentalCheckupDate)} />
              <Field label="Dental Clinic / Health Facility" value={selectedMother.dentalFacility || '—'} />
              <Field label="Dentist in Charge" value={selectedMother.dentistInCharge || selectedMother.dentist_in_charge || '—'} />
              <Field label="Community Dentist Name" value={selectedMother.communityDentist || '—'} />
              <Field label="Dentist License No" value={selectedMother.dentistLicense || selectedMother.dentist_license || '—'} />
              <Field label="Dentist Contact No" value={selectedMother.dentistContact || selectedMother.dentist_contact || '—'} />
              <Field label="Number of Teeth" value={selectedMother.teethCount || '—'} />
            </div>

            <div className="detail-form-field full-width" style={{ marginTop: '0.9rem' }}>
              <div className="detail-form-label">Dental Findings / Diagnosis</div>
              <div className="detail-form-value">{selectedMother.dentalFindings || '—'}</div>
            </div>

            <div className="detail-form-field full-width" style={{ marginTop: '0.9rem' }}>
              <div className="detail-form-label">Dental Work Done</div>
              <ChipList items={dentalList} emptyLabel="None" />
            </div>

            <Field label="Remarks / Recommendations" value={selectedMother.dentalRemarks || '—'} className="full-width" />
          </section>

          <section className="mother-detail-section">
            <h3 className="mother-detail-section-title">IV.C VACCINE RECORD</h3>
            <div className="detail-form-field full-width">
              <div className="mother-detail-table-wrap">
                <table className="mother-detail-table">
                  <thead>
                    <tr>
                      <th>Vaccine</th>
                      <th>Date Given</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vaccineRows.map((row) => (
                      <tr key={row.vaccine}>
                        <td>{row.vaccine}</td>
                        <td>{row.date}</td>
                        <td>{row.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
