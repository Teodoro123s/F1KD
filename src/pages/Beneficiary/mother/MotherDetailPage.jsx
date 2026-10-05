import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateForDisplay } from '../../../utils/dateFormat';
import { apiDeleteMother, apiGetMother } from '../../../api/mothers';
import { DocumentPreview, DocumentPreviewModal } from '../../../components/DocumentPreview';
import { useAuth } from '../../../auth/AuthProvider';
import { can } from '../../../utils/permissions';
import PageHeader from '../../../components/ui/PageHeader';
import { notifyAction } from '../../../components/ActionFeedback';
import { MotherFormFields } from './BeneficiaryMother';

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

export default function MotherDetailPage({ selectedMother, onClose, onMotherUpdated, overviewOnly = false }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const canManage = can(currentUser?.role, 'beneficiary-resources', 'delete');
  const canEdit = can(currentUser?.role, 'beneficiary-resources', 'update');
  const [motherRecord, setMotherRecord] = useState(selectedMother);
  const [activeTab, setActiveTab] = useState('overview');
  const [profileTab, setProfileTab] = useState('general');
  const [previewDocument, setPreviewDocument] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!selectedMother) return undefined;
    let active = true;
    const motherIdentifier = selectedMother.raw?.id || selectedMother.id || selectedMother.motherId;
    setMotherRecord(selectedMother);
    if (!motherIdentifier) return undefined;

    apiGetMother(motherIdentifier)
      .then((response) => {
        if (active && response?.mother) {
          setMotherRecord((current) => ({ ...current, ...response.mother }));
        }
      })
      .catch((error) => console.error('[MotherDetailPage] Unable to load mother from database:', error));

    return () => { active = false; };
  }, [selectedMother]);

  if (!selectedMother) return null;

  const mother = motherRecord || selectedMother;

  const children = Array.isArray(mother.children) ? mother.children : [];
  const hasMultipleChildren = children.length > 1;
  const childBadge = (child) => {
    const value = child?.multipleBirthType || child?.multiple_birth_type;
    return value ? `[${value}]` : null;
  };

  const fullName = [
    mother.firstName || mother.first_name,
    mother.middleName || mother.middle_name,
    mother.lastName || mother.last_name,
    mother.suffix,
  ].filter(Boolean).join(' ');
  const motherId = mother.motherId || mother.id || 'M-unknown';
  const age = calculateAge(mother.dob);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/beneficiary');
  };

  const firstName = mother.firstName || '—';
  const middleName = mother.middleName || '—';
  const lastName = mother.lastName || '—';
  const maidenSurname = mother.maidenSurname || '—';
  const suffix = mother.suffix || '—';
  const dob = formatDateForDisplay(mother.dob);
  const contact = mother.contactNumber || mother.contact || '—';
  const address = mother.address || mother.currentAddress || mother.area || mother.community || '—';
  const area = mother.area || '—';
  const community = mother.community || '—';
  const group = mother.group || '—';
  const batch = mother.batch || '—';
  const addressParts = String(mother.address || '').split(',').map((part) => part.trim()).filter(Boolean);
  const highRisk = mother.isHighRisk ?? mother.is_high_risk ?? 'No';
  const program = mother.programType || mother.program || 'Maternal Health Program';

  const emergencyName = mother.emergencyName || '—';
  const emergencyContact = mother.emergencyContact || '—';
  const emergencyRelationship = mother.emergencyRelationship || '—';
  const spouseName = mother.spouseName || '—';

  const weight = mother.weight || mother.prenatalWeight || '—';
  const height = mother.height || mother.prenatalHeight || '—';
  const prenatalBp = mother.prenatalBp || '—';
  const fundalHeight = mother.fundalHeight || '—';
  const fhr = mother.fhr || '—';
  const gravida = mother.gravida ?? '—';
  const para = mother.para ?? '—';
  const abortion = mother.abortion ?? '—';
  const stillbirth = mother.stillbirth ?? '—';
  const lmp = formatDateForDisplay(mother.lmpDate || mother.lmp);
  const edd = formatDateForDisplay(mother.eddDate || mother.edd);
  const prenatalRegDate = formatDateForDisplay(mother.prenatalRegDate);
  const trimester = mother.trimester || '—';
  const gestationalAge = mother.gestationalAge || '—';

  const medicalConditions = mother.medicalConditions || {};
  const medicalList = getListValues(medicalConditions);
  const dentalWork = mother.dentalWork || {};
  const dentalList = getListValues(dentalWork);

  const obHistory = Array.isArray(mother.obHistory) ? mother.obHistory : [];
  const vaccineRows = [1, 2, 3, 4, 5].map((num) => ({
    vaccine: `TT${num}`,
    date: formatDateForDisplay(mother[`tt${num}Date`]),
    remarks: mother[`tt${num}Remarks`] || '—',
  }));

  const detailForm = {
    ...mother,
    firstName,
    middleName,
    lastName,
    maidenSurname,
    suffix,
    dob,
    contactNumber: contact,
    lmpDate: lmp,
    eddDate: edd,
    province: mother.province || addressParts[0] || '',
    city: mother.city || addressParts[1] || '',
    barangay: mother.barangay || addressParts[2] || '',
    community,
    groupId: group,
    batchId: batch,
    prenatalRegDate,
    dentalCheckupDate: formatDateForDisplay(mother.dentalCheckupDate),
    tt1Date: vaccineRows[0].date,
    tt2Date: vaccineRows[1].date,
    tt3Date: vaccineRows[2].date,
    tt4Date: vaccineRows[3].date,
    tt5Date: vaccineRows[4].date,
  };

  const deleteMother = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await apiDeleteMother(motherId);
      setShowDeleteModal(false);
      onClose?.();
    } catch (error) {
      const message = error.message || 'Unable to delete mother and children.';
      notifyAction(message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const documentContent = (
    <section className="create-mother-category mother-detail-inline-documents">
      <h4 className="form-section-title">I.C DOCUMENTS</h4>
      <div className="document-upload-grid">
        {[
          ['birthCertificate', "Mother's Birth Certificate", motherRecord.birthCertificateDocumentName, motherRecord.birthCertificateDocumentPath],
          ['consent', 'Program Consent Form', motherRecord.consentDocumentName, motherRecord.consentDocumentPath],
        ].map(([field, label, fileName, filePath]) => {
          return (
            <div className="document-upload-field" key={field}>
              <div className="document-upload-header-row">
                <span className="detail-form-label">{label}</span>
              </div>
              <DocumentPreview fileName={fileName} filePath={filePath} label={label} onPreviewOpen={(url, name, type) => setPreviewDocument({ url, name, type })} />
            </div>
          );
        })}
      </div>
    </section>
  );

  return (
    <section className="mother-detail-page">
      <PageHeader
        title={fullName || 'Mother Profile'}
        breadcrumbs={[{ label: 'Beneficiaries', href: '/beneficiary' }, { label: 'Mother Profile' }]}
        actions={(
          <div className="mother-detail-actions">
            {canManage && <button type="button" className="btn-danger" onClick={() => setShowDeleteModal(true)}>Delete</button>}
            {canEdit && <button type="button" className="btn-secondary" onClick={() => navigate(`/beneficiary/mother/${motherId}/edit`, { state: { mother: selectedMother } })}>Edit</button>}
            <button type="button" className="btn-secondary back-action" onClick={handleBack}>Back</button>
          </div>
        )}
      />

      {overviewOnly && (
        <section className="mother-detail-section">
          <h3 className="mother-detail-section-title">Mother Actions</h3>
          <div className="mother-detail-actions mother-overview-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate(`/beneficiary/mother/${motherId}/profile`, { state: { mother: selectedMother } })}>Mother Profile</button>
            <button type="button" className="btn-secondary" onClick={() => {
              navigate(`/beneficiary/mother/${motherId}/child`, { state: { mother: selectedMother, children, returnTo: `/beneficiary/mother/${motherId}` } });
            }}>View Child</button>
            <button type="button" className="btn-primary" onClick={() => navigate('/monitoring', { state: { mother, returnTo: `/beneficiary/mother/${motherId}` } })}>Monitor</button>
          </div>
        </section>
      )}

      {showDeleteModal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !deleting && setShowDeleteModal(false)}>
          <div className="modal mother-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-mother-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="delete-mother-title">Delete mother record?</h2>
            <p>
              This permanently deletes <strong>{fullName}</strong> and all linked child records and monitoring data.
              {children.length > 0 && ` ${children.length} child record${children.length === 1 ? '' : 's'} will also be deleted.`}
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</button>
              <button type="button" className="btn-danger" onClick={deleteMother} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete permanently'}</button>
            </div>
          </div>
        </div>
      )}

      {!overviewOnly && (activeTab === 'children' ? (
        <section className="mother-detail-section">
          <h3 className="mother-detail-section-title">Children</h3>
          <div className="table-card beneficiary-table-card mother-children-detail-table">
            <div className="table-overflow">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Child Name</th>
                    <th>Birth Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
            {children.map((child) => {
              const childNameValue = `${child.firstName || child.first_name || ''} ${child.middleName || child.middle_name || ''} ${child.lastName || child.last_name || ''}`.replace(/\s+/g, ' ').trim() || child.child_code || child.id;
              const badge = childBadge(child);
              return (
                <tr key={child.id || `${child.motherId || motherId}-${childNameValue}`}>
                  <td><strong>{childNameValue}</strong>{badge && <span className="mother-detail-chip" style={{ marginLeft: 8 }}>{badge}</span>}</td>
                  <td>{formatDateForDisplay(child.birthDate || child.birth_date) || 'Birth date not recorded'}</td>
                  <td>
                    <button type="button" className="btn-secondary" onClick={() => navigate(`/beneficiary/child/${child.id}`, { state: { mother: selectedMother, child, returnTo: `/beneficiary/mother/${motherId}` } })}>View Child</button>
                  </td>
                </tr>
              );
            })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : (
        <div className="mother-detail-profile-content">
          <div className="stepper-progress mother-detail-stepper">
            <div className="stepper-steps" role="tablist" aria-label="Mother profile sections">
              {[
                ['general', 'General'],
                ['prenatal', 'Prenatal/OB'],
                ['medical_dental', 'Medical & Dental'],
                ['vaccine', 'Vaccine'],
              ].map(([tab, label], index) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={profileTab === tab}
                  className={`stepper-step ${profileTab === tab ? 'active' : ''}`}
                  onClick={() => setProfileTab(tab)}
                >
                  <span className="stepper-step-index">{index + 1}</span>
                  <span className="stepper-step-label">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="create-form-body mother-detail-shared-form">
            <div className="modal-body-scrollable">
              <MotherFormFields activeTab={profileTab} form={detailForm} readOnly documentContent={documentContent} />
            </div>
          </div>

          <section className="mother-detail-section">
            <h3 className="mother-detail-section-title">I.A MOTHER'S INFORMATION</h3>
            <div className="mother-detail-grid">
              <Field label="Surname Name" value={lastName} />
              <Field label="First Name" value={firstName} />
              <Field label="Middle Name" value={middleName} />
              <Field label="Maiden Surname" value={maidenSurname} />
              <Field label="Suffix" value={suffix} />
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

          <DocumentPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />

          <section className="mother-detail-section">
            <h3 className="mother-detail-section-title">I.C OTHER DETAILS</h3>
            <div className="mother-detail-grid">
              <Field label="Weight (kg)" value={weight} />
              <Field label="Height (cm)" value={height} />
              <Field label="Blood Pressure" value={prenatalBp} />
              <Field label="Fundal Height" value={fundalHeight} />
              <Field label="FHR" value={fhr} />
              <Field label="Prenatal Weight" value={mother.prenatalWeight || '—'} />
            </div>
          </section>

          <section className="mother-detail-section">
            <h3 className="mother-detail-section-title">II. INITIAL PRENATAL ASSESSMENT &amp; MATERNAL HEALTH PROFILE</h3>
            <div className="mother-detail-grid">
              <Field label="Date of Prenatal Registration" value={prenatalRegDate} />
              <Field label="Gestational Age at Reg (weeks)" value={gestationalAge} />
              <Field label="Weight (kg) at Reg" value={mother.prenatalWeight || '—'} />
              <Field label="Blood Pressure (BP) at Reg" value={prenatalBp} />
              <Field label="Height (cm) at Reg" value={mother.prenatalHeight || '—'} />
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
            <Field label="Other Medical History" value={mother.otherMedicalHistory || '—'} className="full-width" />
          </section>

          <section className="mother-detail-section">
            <h3 className="mother-detail-section-title">IV.B ORAL HEALTH CONDITION</h3>
            <div className="mother-detail-grid">
              <Field label="Date of Dental Check-up" value={formatDateForDisplay(mother.dentalCheckupDate)} />
              <Field label="Dental Clinic / Health Facility" value={mother.dentalFacility || '—'} />
              <Field label="Dentist in Charge" value={mother.dentistInCharge || mother.dentist_in_charge || '—'} />
              <Field label="Community Dentist Name" value={mother.communityDentist || '—'} />
              <Field label="Dentist License No" value={mother.dentistLicense || mother.dentist_license || '—'} />
              <Field label="Dentist Contact No" value={mother.dentistContact || mother.dentist_contact || '—'} />
              <Field label="Number of Teeth" value={mother.teethCount || '—'} />
            </div>

            <div className="detail-form-field full-width" style={{ marginTop: '0.9rem' }}>
              <div className="detail-form-label">Dental Findings / Diagnosis</div>
              <div className="detail-form-value">{mother.dentalFindings || '—'}</div>
            </div>

            <div className="detail-form-field full-width" style={{ marginTop: '0.9rem' }}>
              <div className="detail-form-label">Dental Work Done</div>
              <ChipList items={dentalList} emptyLabel="None" />
            </div>

            <Field label="Remarks / Recommendations" value={mother.dentalRemarks || '—'} className="full-width" />
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
        </div>
      ))}
    </section>
  );
}
