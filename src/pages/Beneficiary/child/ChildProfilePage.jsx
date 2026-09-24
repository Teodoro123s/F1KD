import React, { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useMothers } from '../../../context/MothersContext';
import { formatDateForDisplay } from '../../../utils/dateFormat';
import { apiDeleteChild, apiUploadChildBirthDocument } from '../../../api/children';
import { resolveAssetUrl } from '../../../api/authHeader';
import { useAuth } from '../../../auth/AuthProvider';
import { can } from '../../../utils/permissions';
import { capitalizeNameValue } from '../../../utils/nameFormat';
import { ChildFormFields } from './BeneficiaryChild';
import PageHeader from '../../../components/ui/PageHeader';
import ConfirmModal from '../../UserManagement/ConfirmModal';
import { notifyAction } from '../../../components/ActionFeedback';

const formatValue = (value) => (value === null || value === undefined || value === '' ? '—' : String(value));

const ChildField = ({ label, value, className = '' }) => (
  <div className={`detail-form-field ${className}`}>
    <div className="detail-form-label">{label}</div>
    <div className={`detail-form-value ${value === null || value === undefined || value === '' || value === '—' ? 'empty' : ''}`}>
      {formatValue(value)}
    </div>
  </div>
);

const getDocumentPreviewType = (filePath = '') => {
  const normalizedPath = String(filePath || '').toLowerCase();
  if (!normalizedPath) return 'none';
  if (normalizedPath.endsWith('.pdf')) return 'pdf';
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(normalizedPath)) return 'image';
  return 'none';
};

const DocumentPreview = ({ fileName, filePath, label, onPreviewOpen }) => {
  const normalizedUrl = resolveAssetUrl(filePath);
  const previewType = getDocumentPreviewType(filePath);

  if (!fileName || !normalizedUrl) {
    return <span className="document-upload-empty">No document uploaded</span>;
  }

  return (
    <div className="document-upload-preview-wrapper">
      {previewType === 'image' && (
        <button type="button" className="document-upload-preview-button" onClick={() => onPreviewOpen?.(normalizedUrl, fileName, 'image')}>
          <img src={normalizedUrl} alt={fileName || label} className="document-upload-preview-image" />
        </button>
      )}
      {previewType === 'pdf' && (
        <button type="button" className="document-upload-preview-button" onClick={() => onPreviewOpen?.(normalizedUrl, fileName, 'pdf')}>
          <div className="document-upload-preview-pdf-shell">
            <object data={normalizedUrl} type="application/pdf" className="document-upload-preview-pdf">
              <iframe src={normalizedUrl} title={fileName || label} className="document-upload-preview-pdf-frame" />
            </object>
          </div>
        </button>
      )}
      {!previewType || previewType === 'none' ? (
        <a href={normalizedUrl} target="_blank" rel="noreferrer">{fileName}</a>
      ) : (
        <button type="button" className="document-upload-filename-link" onClick={() => onPreviewOpen?.(normalizedUrl, fileName, previewType)}>{fileName}</button>
      )}
    </div>
  );
};

const ChildSection = ({ title, children, fullWidth = false }) => (
  <section className="child-detail-section">
    <h3 className="child-detail-section-title">{title}</h3>
    <div className={`child-detail-grid ${fullWidth ? 'child-detail-grid--full' : ''}`}>{children}</div>
  </section>
);

const calculateAgeDecimal = (dobString) => {
  if (!dobString) return null;
  const birth = new Date(dobString);
  const now = new Date();
  const diffMs = now - birth;
  const years = diffMs / (365.25 * 24 * 60 * 60 * 1000);
  return Math.round(years * 10) / 10;
};

const getBmiValue = (weight, heightCm) => {
  const numericWeight = Number(weight);
  const numericHeight = Number(heightCm);
  if (!Number.isFinite(numericWeight) || !Number.isFinite(numericHeight) || numericHeight <= 0) return '—';
  const heightM = numericHeight / 100;
  const bmi = numericWeight / (heightM * heightM);
  return Number.isFinite(bmi) ? bmi.toFixed(1) : '—';
};

const getBmiStatus = (weight, heightCm) => {
  const bmiText = getBmiValue(weight, heightCm);
  if (bmiText === '—') return '—';
  const bmi = Number(bmiText);
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

const normalizeChild = (child = {}) => ({
  ...child,
  firstName: capitalizeNameValue(child.firstName || child.first_name || ''),
  middleName: capitalizeNameValue(child.middleName || child.middle_name || ''),
  lastName: capitalizeNameValue(child.lastName || child.last_name || ''),
  suffix: capitalizeNameValue(child.suffix || ''),
  motherId: child.motherId || child.mother_id || '',
  motherName: child.motherName || [child.mother_first_name, child.mother_last_name].filter(Boolean).join(' '),
  birthDate: child.birthDate || child.birth_date || '',
  birthWeight: child.birthWeight || child.birth_weight || '',
  birthLength: child.birthLength || child.birth_length || '',
  gender: child.gender || '',
  bloodType: child.bloodType || child.blood_type || '',
  noOfChildDelivered: child.noOfChildDelivered || child.no_of_child_delivered || '',
  multipleBirthType: child.multipleBirthType || child.multiple_birth_type || '',
  exclusiveBreastfeeding: child.exclusiveBreastfeeding || child.exclusive_breastfeeding || '',
  expandedNewbornScreening: child.expandedNewbornScreening || child.expanded_newborn_screening || '',
  expandedNewbornScreeningResult: child.expandedNewbornScreeningResult || child.expanded_newborn_screening_result || '',
    deliveryType: child.deliveryType || child.delivery_type || 'Vaginal',
    healthStatus: child.healthStatus || child.health_status || 'Healthy',
    birthPlace: child.birthPlace || child.birth_place || '',
    birthAttendant: child.birthAttendant || child.birth_attendant || '',
    apgarScore: child.apgarScore || child.apgar_score || '',
    feedingType: child.feedingType || child.feeding_type || '',
    nutritionNotes: child.nutritionNotes || child.nutrition_notes || '',
    address: child.address || '',
  community: child.community || child.community_name || '',
  batch: child.batch || child.batch_name || '',
    medicalConditions: child.medicalConditions || child.medical_conditions || {},
    medicalRemarks: child.medicalRemarks || child.medical_remarks || '',
  birthDocumentName: child.birthDocumentName || child.birth_document_name || '',
  birthDocumentPath: child.birthDocumentPath || child.birth_document_path || '',
    bcgDate: child.BCG?.vaccine_date || child.bcgDate || child.bcg_date || '',
    bcgRemarks: child.BCG?.remarks || child.bcgRemarks || child.bcg_remarks || '',
    hepbDate: child.HepB?.vaccine_date || child.hepbDate || child.hepb_date || '',
    hepbRemarks: child.HepB?.remarks || child.hepbRemarks || child.hepb_remarks || '',
    opvDate: child.OPV?.vaccine_date || child.opvDate || child.opv_date || '',
    opvRemarks: child.OPV?.remarks || child.opvRemarks || child.opv_remarks || '',
    dptDate: child.DPT?.vaccine_date || child.dptDate || child.dpt_date || '',
    dptRemarks: child.DPT?.remarks || child.dptRemarks || child.dpt_remarks || '',
    mmrDate: child.MMR?.vaccine_date || child.mmrDate || child.mmr_date || '',
    mmrRemarks: child.MMR?.remarks || child.mmrRemarks || child.mmr_remarks || '',
});

export default function ChildProfilePage() {
  const { childId, id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const canManage = can(currentUser?.role, 'partner-resources', 'create');

  const stateMother = location.state?.mother || null;
  const { mothers: contextMothers } = useMothers();
  const childFromState = location.state?.child ? normalizeChild(location.state.child) : null;

  // Helper: find a child in session sources and return { child, mother }
  const findChildInSession = (searchId) => {
    if (!searchId) return null;

    // search mothers provided in location state first
    if (Array.isArray(location.state?.mothers)) {
      for (const m of location.state.mothers) {
        if (Array.isArray(m.children)) {
          const found = m.children.find((c) => String(c.id) === String(searchId));
          if (found) return { child: found, mother: m };
        }
      }
    }

    // search context mothers
    if (Array.isArray(contextMothers)) {
      for (const m of contextMothers) {
        if (Array.isArray(m.children)) {
          const found = m.children.find((c) => String(c.id) === String(searchId));
          if (found) return { child: found, mother: m };
        }
        // if mother has id matching child.mother_id later
      }
    }

    // search direct children list from state
    if (Array.isArray(location.state?.children)) {
      const found = location.state.children.find((c) => String(c.id) === String(searchId));
      if (found) return { child: found };
    }
    // search groups (where CreateChildPage may have added new child records)
    if (Array.isArray(location.state?.groups)) {
      const found = location.state.groups.find((c) => String(c.id) === String(searchId));
      if (found) return { child: found };
    }

    return null;
  };

  const resolvedFromUrl = childId ? findChildInSession(childId) : (id ? findChildInSession(id) : null);

  const initialSelected = childFromState || (resolvedFromUrl?.child ? normalizeChild(resolvedFromUrl.child) : null);
  const [selectedChild, setSelectedChild] = useState(initialSelected);
  const [uploadingBirthDocument, setUploadingBirthDocument] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isEditingBirthDocument, setIsEditingBirthDocument] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [profileTab, setProfileTab] = useState('general');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isChildProfile = location.pathname.endsWith('/profile');

  const uploadBirthDocument = async (file) => {
    if (!file || !selectedChild?.id) return;
    setUploadingBirthDocument(true);
    setUploadMessage('');
    try {
      const response = await apiUploadChildBirthDocument(selectedChild.id, file);
      if (response?.child) {
        const nextChild = normalizeChild(response.child);
        setSelectedChild(nextChild);
        if (location.state) {
          location.state.updatedChild = nextChild;
        }
      }
      setUploadMessage('Document uploaded successfully.');
    } catch (error) {
      setUploadMessage(error.message || 'Unable to upload document.');
    } finally {
      setUploadingBirthDocument(false);
    }
  };

  const requestDeleteChild = () => {
    if (!canManage || !selectedChild?.id || isDeleting) return;
    setShowDeleteConfirm(true);
  };

  const deleteChild = async () => {
    if (!canManage || !selectedChild?.id || isDeleting) return;
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    setUploadMessage('');
    try {
      await apiDeleteChild(selectedChild.id);
      notifyAction(`${childName || 'Child'} deleted successfully.`);
      navigate('/beneficiary');
    } catch (error) {
      setUploadMessage(error.message || 'Unable to delete child.');
      setIsDeleting(false);
    }
  };

  React.useEffect(() => {
    if (location.state?.updatedChild) {
      setSelectedChild((current) => ({ ...(current || {}), ...location.state.updatedChild }));
    }
  }, [location.state?.updatedChild]);

  // Determine the most likely mother for display
  const findMotherForChild = (child) => {
    if (!child) return stateMother || null;
    // If child has explicit mother id, search context
    if (child.mother_id || child.motherId) {
      const mid = child.mother_id || child.motherId;
        const found = contextMothers.find((m) => (
          String(m.id) === String(mid) ||
          String(m.motherId) === String(mid) ||
          String(m.raw?.id) === String(mid)
        ));
      if (found) return found;
    }
    if (child.motherName) {
      return { id: child.motherId || child.mother_id, motherId: child.motherId || child.mother_id, name: child.motherName };
    }
    // if resolvedFromUrl had a mother
    if (resolvedFromUrl && resolvedFromUrl.mother) return resolvedFromUrl.mother;
    // fallback to state mother
    return stateMother || null;
  };

  const resolvedMother = findMotherForChild(selectedChild || initialSelected || resolvedFromUrl?.child);

  // Refresh the URL record so navigation state cannot leave stale or partial details displayed.
  React.useEffect(() => {
    let canceled = false;
    const idToFetch = (childId || id);
    if (idToFetch) {
      (async () => {
        try {
          const mod = await import('../../../api/children');
          const res = await mod.apiGetChild(idToFetch);
          if (res && res.child && !canceled) {
            // normalize returned child to match expected shape
            const c = res.child;
            setSelectedChild(normalizeChild({
              ...c,
              motherId: c.mother_code || c.mother_id,
              motherName: [c.mother_first_name, c.mother_last_name].filter(Boolean).join(' '),
              bcgDate: c.BCG?.vaccine_date,
              bcgRemarks: c.BCG?.remarks,
              hepbDate: c.HepB?.vaccine_date,
              hepbRemarks: c.HepB?.remarks,
              opvDate: c.OPV?.vaccine_date,
              opvRemarks: c.OPV?.remarks,
              dptDate: c.DPT?.vaccine_date,
              dptRemarks: c.DPT?.remarks,
              mmrDate: c.MMR?.vaccine_date,
              mmrRemarks: c.MMR?.remarks,
            }));
          }
        } catch (err) {
          // ignore - child likely not found or network error
          console.warn('Could not fetch child from server', err);
        }
      })();
    }
    return () => { canceled = true; };
  }, [childId, id]);


  // Helper to render vaccination info
  const renderVaccine = (date, remarks) => (date ? `${date}${remarks ? ' — ' + remarks : ''}` : '—');
  const returnTo = location.state?.returnTo || (resolvedMother ? `/beneficiary/mother/${resolvedMother.motherId || resolvedMother.id}` : null);
  const childIdentifier = selectedChild?.id || childId || id;

  const childName = selectedChild?.name || `${selectedChild?.firstName || ''} ${selectedChild?.middleName || ''} ${selectedChild?.lastName || ''} ${selectedChild?.suffix || ''}`.replace(/\s+/g, ' ').trim();
  const childBirthDate = formatDateForDisplay(selectedChild?.birthDate || selectedChild?.birth_date);
  const childWeight = selectedChild?.birthWeight || selectedChild?.birth_weight || '—';
  const childHeight = selectedChild?.birthLength || selectedChild?.birth_length || '—';
  const childBmi = getBmiValue(childWeight, childHeight);
  const childBmiStatus = getBmiStatus(childWeight, childHeight);
  const vaccineRows = [
    { label: 'BCG', date: formatDateForDisplay(selectedChild?.bcgDate), remarks: selectedChild?.bcgRemarks || '—' },
    { label: 'Hepatitis B', date: formatDateForDisplay(selectedChild?.hepbDate), remarks: selectedChild?.hepbRemarks || '—' },
    { label: 'Inactivated Polio Vaccine', date: formatDateForDisplay(selectedChild?.ipvDate || selectedChild?.ipv_date), remarks: selectedChild?.ipvRemarks || selectedChild?.ipv_remarks || '—' },
    { label: 'Pentavalent Vaccine', date: formatDateForDisplay(selectedChild?.dptDate), remarks: selectedChild?.dptRemarks || '—' },
    { label: 'Oral Polio Vaccine (OPV)', date: formatDateForDisplay(selectedChild?.opvDate), remarks: selectedChild?.opvRemarks || '—' },
    { label: 'Pneumococcal (PCV)', date: formatDateForDisplay(selectedChild?.pcvDate || selectedChild?.pcv_date), remarks: selectedChild?.pcvRemarks || selectedChild?.pcv_remarks || '—' },
    { label: 'Measles, Mumps, Rubella (MMR)', date: formatDateForDisplay(selectedChild?.mmrDate), remarks: selectedChild?.mmrRemarks || '—' },
  ];

  const detailForm = {
    ...(selectedChild || {}),
    birthDate: formatDateForDisplay(selectedChild?.birthDate || selectedChild?.birth_date),
    birthWeight: selectedChild?.birthWeight || selectedChild?.birth_weight || '',
    birthLength: selectedChild?.birthLength || selectedChild?.birth_length || '',
    deliveryType: selectedChild?.deliveryType || selectedChild?.delivery_type || '',
    birthAttendant: selectedChild?.birthAttendant || selectedChild?.birth_attendant || '',
    apgarScore: selectedChild?.apgarScore || selectedChild?.apgar_score || '',
    feedingType: selectedChild?.feedingType || selectedChild?.feeding_type || '',
    nutritionNotes: selectedChild?.nutritionNotes || selectedChild?.nutrition_notes || '',
    medicalConditions: selectedChild?.medicalConditions || {},
    medicalRemarks: selectedChild?.medicalRemarks || selectedChild?.medical_remarks || '',
  };

  const rightColumnContent = (!selectedChild && (childId || id)) ? (
    <div>
      <h2>Child data not available in this session</h2>
      <p>The child with ID <strong>{childId || id}</strong> could not be found in the current client state. Deep links work in-session when a child object is provided via navigation state or when the app has loaded that child earlier.</p>
      <p>If you navigated here from another page in this session, return to that page and open the child from there. Otherwise, the child record will be visible after the app loads child lists from the backend.</p>
    </div>
  ) : (!selectedChild ? (
    <div>
      <h2>No child selected</h2>
      <p>Select a child from the list or create a new child record for this mother.</p>
    </div>
  ) : (
    <section className="mother-detail-page child-detail-page">
      <PageHeader
        title={childName || 'Child Profile'}
        breadcrumbs={[{ label: 'Beneficiaries', href: '/beneficiary' }, { label: 'Child Profile' }]}
        actions={(
          <div className="mother-detail-actions">
            {isChildProfile && canManage && (
              <button type="button" className="btn-secondary" onClick={() => navigate(`/beneficiary/child/${childIdentifier}/edit`, { state: { child: selectedChild, mother: resolvedMother, returnTo } })}>Edit</button>
            )}
            {canManage && (
              <button type="button" className="btn-secondary" onClick={requestDeleteChild} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
          </div>
        )}
      />

      <ConfirmModal
        show={showDeleteConfirm}
        message={`Delete ${childName || 'this child'} and all of their beneficiary data? This cannot be undone.`}
        onConfirm={deleteChild}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {!isChildProfile && <section className="mother-detail-section">
        <h3 className="mother-detail-section-title">Child Actions</h3>
        <div className="mother-detail-actions mother-overview-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate(`/beneficiary/child/${childIdentifier}/profile`, { state: { child: selectedChild, mother: resolvedMother, returnTo } })}>
            Child Profile
          </button>
          {resolvedMother && (
            <button type="button" className="btn-secondary" onClick={() => navigate(`/beneficiary/mother/${resolvedMother.id || resolvedMother.motherId}`, { state: { mother: resolvedMother } })}>
              View Mother
            </button>
          )}
          <button type="button" className="btn-primary" onClick={() => {
            const mid = resolvedMother?.motherId || resolvedMother?.id || selectedChild.mother_id || selectedChild.motherId || '';
            const stateMother = resolvedMother || (mid ? { id: mid, name: selectedChild.mother_first_name ? `${selectedChild.mother_first_name} ${selectedChild.mother_last_name || ''}`.trim() : undefined } : null);
            navigate('/monitoring', { state: { child: selectedChild, mother: stateMother, returnTo } });
          }}>
            Monitor
          </button>
        </div>
      </section>}

      {isChildProfile && (<>
      <div className="stepper-progress child-detail-stepper">
        <div className="stepper-steps" role="tablist" aria-label="Child profile sections">
          {[
            ['general', 'General'],
            ['prenatal', 'Prenatal/OB'],
            ['medical_dental', 'Medical & Dental'],
            ['vaccine', 'Vaccine'],
          ].map(([tab, label], index) => (
            <button key={tab} type="button" role="tab" aria-selected={profileTab === tab} className={`stepper-step ${profileTab === tab ? 'active' : ''}`} onClick={() => setProfileTab(tab)}>
              <span className="stepper-step-index">{index + 1}</span>
              <span className="stepper-step-label">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="create-form-body child-detail-shared-form">
        <div className="modal-body-scrollable">
          <ChildFormFields activeTab={profileTab} form={detailForm} readOnly />
        </div>
      </div>

      {profileTab === 'general' && (
        <ChildSection title="I.B REQUIRED DOCUMENTS">
          <div className="document-upload-field full-width">
            <div className="document-upload-header-row">
              <label className="detail-form-label" htmlFor="child-birth-document">Live Birth Certificate / Birth Certificate</label>
              <div className="document-upload-menu-wrap">
                <button
                  type="button"
                  className="document-upload-menu-button"
                  aria-label="Document actions for birth certificate"
                  aria-expanded={isEditingBirthDocument || false}
                  onClick={() => setIsEditingBirthDocument((current) => !current)}
                >
                  ⋯
                </button>
                {selectedChild.birthDocumentName && isEditingBirthDocument && (
                  <div className="document-upload-menu" role="menu">
                    <button type="button" role="menuitem" onClick={() => setIsEditingBirthDocument((current) => !current)}>
                      {isEditingBirthDocument ? 'Cancel edit' : 'Edit'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            {(isEditingBirthDocument || !selectedChild.birthDocumentName) && (
              <input id="child-birth-document" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => {
                uploadBirthDocument(event.target.files?.[0]);
                setIsEditingBirthDocument(false);
              }} disabled={uploadingBirthDocument} />
            )}
            <DocumentPreview fileName={selectedChild.birthDocumentName} filePath={selectedChild.birthDocumentPath} label="Live Birth Certificate" onPreviewOpen={(url, name, type) => setPreviewDocument({ url, name, type })} />
            {uploadMessage && <span className="document-upload-message" role="status">{uploadMessage}</span>}
          </div>
        </ChildSection>
      )}

      {previewDocument && (
        <div className="document-preview-modal-backdrop" onClick={() => setPreviewDocument(null)}>
          <div className="document-preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="document-preview-modal-header">
              <strong>{previewDocument.name}</strong>
              <button type="button" className="document-preview-close" onClick={() => setPreviewDocument(null)}>Close</button>
            </div>
            {previewDocument.type === 'image' ? (
              <img src={previewDocument.url} alt={previewDocument.name} className="document-preview-modal-image" />
            ) : (
              <iframe src={previewDocument.url} title={previewDocument.name} className="document-preview-modal-frame" />
            )}
          </div>
        </div>
      )}
      </>)}
    </section>
  ));

  return (
    <div className="community-page beneficiary-page">
      <PageHeader title="Beneficiaries" breadcrumbs={[{ label: 'Beneficiaries' }]} />
      <main className="beneficiary-main">
        {rightColumnContent}
      </main>
    </div>
  );
}
