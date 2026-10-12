import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateForDisplay } from '../../_shared/utils/dateFormat';
import { apiDeleteMother, apiGetMother } from '../../../../../api/mothers';
import { DocumentPreview, DocumentPreviewModal } from '../../_shared/components/DocumentPreview';
import { useAuth } from '../../../../../auth/AuthProvider';
import { can } from '../../../../../utils/permissions';
import PageHeader from '../../../../../components/ui/PageHeader';
import { notifyAction } from '../../_shared/components/ActionFeedback';
import { MotherFormFields } from './BeneficiaryMother';
import MonitoringProgressReport from '../../../../shared/Beneficiary/MonitoringProgressReport';
import './mother-detail-page.css';

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
  const community = mother.community || '—';
  const group = mother.group || '—';
  const batch = mother.batch || '—';
  const addressParts = String(mother.address || '').split(',').map((part) => part.trim()).filter(Boolean);
  const lmp = formatDateForDisplay(mother.lmpDate || mother.lmp);
  const edd = formatDateForDisplay(mother.eddDate || mother.edd);
  const prenatalRegDate = formatDateForDisplay(mother.prenatalRegDate);
  const vaccineDates = [1, 2, 3, 4, 5].map((num) => formatDateForDisplay(mother[`tt${num}Date`]));

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
    tt1Date: vaccineDates[0],
    tt2Date: vaccineDates[1],
    tt3Date: vaccineDates[2],
    tt4Date: vaccineDates[3],
    tt5Date: vaccineDates[4],
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
    <section className={`mother-detail-page${overviewOnly ? ' mother-detail-page--overview' : ''}`}>
      {overviewOnly ? (
        <section className="mother-detail-overview-card">
          <PageHeader
            title={fullName || 'Mother Profile'}
            breadcrumbs={[{ label: 'Beneficiaries', href: '/beneficiary' }, { label: 'Mother Profile' }]}
            actions={(
              <div className="mother-detail-actions">
                <button type="button" className="btn-secondary back-action" onClick={handleBack}>
                  <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19 12H5m0 0 6 6m-6-6 6-6" /></svg>
                  Back
                </button>
                {canEdit && <button type="button" className="btn-secondary" onClick={() => navigate(`/beneficiary/mother/${motherId}/edit`, { state: { mother: selectedMother } })}>Edit</button>}
                {canManage && (
                  <button type="button" className="btn-danger mother-delete-icon-button" aria-label="Delete mother" title="Delete mother" onClick={() => setShowDeleteModal(true)}>
                    <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6" /></svg>
                  </button>
                )}
              </div>
            )}
          />
          <div className="mother-detail-overview-actions">
            <span className="mother-detail-overview-kicker">Mother Actions</span>
            <div className="mother-detail-actions">
              <button type="button" className="mother-action-pill" onClick={() => navigate(`/beneficiary/mother/${motherId}/profile`, { state: { mother: selectedMother } })}>
                <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>
                Mother Profile
              </button>
              <button type="button" className="mother-action-pill" onClick={() => {
                navigate(`/beneficiary/mother/${motherId}/child`, { state: { mother: selectedMother, children, returnTo: `/beneficiary/mother/${motherId}` } });
              }}>
                <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r=".7" /><circle cx="15" cy="10" r=".7" /><path d="M8.5 14a4.2 4.2 0 0 0 7 0" /></svg>
                View Child
              </button>
              <button type="button" className="btn-primary mother-action-pill" onClick={() => navigate('/monitoring', { state: { mother, returnTo: `/beneficiary/mother/${motherId}` } })}>
                <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5V3h6v1.5m-6 8 2 2 4-4" /></svg>
                Monitor
              </button>
            </div>
          </div>
        </section>
      ) : (
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
      )}

      {overviewOnly && (
        <>
          <MonitoringProgressReport beneficiaryType="Mother" beneficiary={{ ...mother, name: fullName }} />
        </>
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
                  <td><strong>{childNameValue}</strong>{badge && <span className="mother-detail-chip" >{badge}</span>}</td>
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
          <div className="mother-detail-profile-panel">
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
          </div>

          <DocumentPreviewModal document={previewDocument} onClose={() => setPreviewDocument(null)} />
        </div>
      ))}
    </section>
  );
}
