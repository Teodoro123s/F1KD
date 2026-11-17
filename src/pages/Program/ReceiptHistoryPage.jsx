import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import PageHeader from '../../components/ui/PageHeader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import UnifiedModal from '../../components/ui/UnifiedModal';
import { notifyAction } from '../../components/ActionFeedback';
import {
  apiDeleteProgramReceiptEvidenceImage,
  apiGetBeneficiaryMonitoringReport,
  apiGetClusterMonitoringReport,
  apiSetBeneficiaryMonitoring,
  apiUploadProgramReceiptEvidence,
} from '../../api/programs';
import { formatDateForDisplay } from '../../utils/formatting/dateFormat';
import { can, canViewAuditSignatures, isCommunityCoordinatorRole } from '../../utils/permissions';
import { navigateBack } from '../../utils/navigation/navigation';
import { getReceiptRecipientKeysForRows } from './utils/programData.js';
import {
  getReceiptEvidenceSelectionError,
  getReceivedReceiptsByDate,
  getRecipientKey,
  isValidRecipient,
  localDate,
  startOfMonth,
  toDateKey,
} from './utils/receiptHistoryUtils.mjs';
import useClusterReceiptRecipients from './hooks/useClusterReceiptRecipients';
import ReceiptEntryModal from './components/ReceiptEntryModal';
import ReceiptHistoryCalendar from './components/ReceiptHistoryCalendar';
import ReceiptHistoryTable from './components/ReceiptHistoryTable';

export default function ReceiptHistoryPage() {
  const { currentUser } = useAuth();
  const { programId, beneficiaryType, beneficiaryId, clusterType, clusterName } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const clusterScopeId = new URLSearchParams(location.search).get('scopeId');
  const isClusterHistory = Boolean(clusterType && clusterName);
  const canEditReceipts = can(currentUser?.role, 'monitor-resources', 'update');
  const showAuditSignatures = canViewAuditSignatures(currentUser?.role);
  const rawBeneficiaryName = location.state?.beneficiaryName || location.state?.clusterName || clusterName || 'Beneficiary';
  const organizerName = String(currentUser?.name || [
    currentUser?.first_name,
    currentUser?.middle_initial,
    currentUser?.last_name,
  ].filter(Boolean).join(' ') || '').trim();
  const organizerSuffix = ` - ${organizerName}`;
  const beneficiaryName = isCommunityCoordinatorRole(currentUser?.role)
    && organizerName
    && rawBeneficiaryName.trim().toLowerCase().endsWith(organizerSuffix.toLowerCase())
    ? rawBeneficiaryName.trim().slice(0, -organizerSuffix.length).trim()
    : rawBeneficiaryName;
  const fallbackReturnTo = isClusterHistory
    ? `/program/${programId}/cluster/${encodeURIComponent(clusterType)}/${encodeURIComponent(clusterName)}`
    : `/program/${programId}`;
  const [reportRows, setReportRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const {
    clusterRecipients,
    selectedRecipientKeys,
    setSelectedRecipientKeys,
    recipientsLoading,
  } = useClusterReceiptRecipients({
    programId,
    clusterName,
    clusterType,
    isClusterHistory,
    locationState: location.state,
    setError,
  });
  const [monitorDate, setMonitorDate] = useState(localDate);
  const [view, setView] = useState('list');
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [evidenceImages, setEvidenceImages] = useState([]);
  const [pendingEvidenceDelete, setPendingEvidenceDelete] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [expandedEvidenceRow, setExpandedEvidenceRow] = useState(null);
  const [programEnded, setProgramEnded] = useState(
    String(location.state?.programStatus || '').trim().toLowerCase() === 'ended',
  );
  const canManageEvidence = canEditReceipts && isCommunityCoordinatorRole(currentUser?.role) && !programEnded;

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = isClusterHistory
        ? await apiGetClusterMonitoringReport(programId, clusterType, clusterName, clusterScopeId)
        : await apiGetBeneficiaryMonitoringReport(programId, beneficiaryType, beneficiaryId);
      setReportRows(response.report || []);
      const reportedStatus = response.programStatus || response.report?.find((row) => row.program_status)?.program_status;
      if (String(reportedStatus || '').trim().toLowerCase() === 'ended') {
        setProgramEnded(true);
      }
    } catch (loadError) {
      setReportRows([]);
      const message = loadError.message || 'Unable to load receipt history.';
      setError(message);
      notifyAction(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [programId, beneficiaryType, beneficiaryId, clusterType, clusterName, clusterScopeId, isClusterHistory]);

  const filteredRows = reportRows;
  const receivedByDate = getReceivedReceiptsByDate(filteredRows);

  const openReceiptModal = (date = monitorDate, defaultMonitored = false, targetRows = null) => {
    if (!canEditReceipts || programEnded) return;
    setError('');
    const dateRows = filteredRows.filter((row) => toDateKey(row.date) === date);
    const existingReceipt = dateRows[0];
    const receivedRows = dateRows.filter((row) => row.monitored);
    const rowsToSelect = targetRows || (defaultMonitored && receivedRows.length ? receivedRows : null);
    setSelectedRecipientKeys(rowsToSelect
      ? getReceiptRecipientKeysForRows(rowsToSelect, clusterRecipients)
      : clusterRecipients.map(getRecipientKey));
    setReceiptModal({
      date,
      monitored: targetRows
        ? Boolean(targetRows[0]?.monitored)
        : (defaultMonitored || (existingReceipt ? Boolean(existingReceipt.monitored) : false)),
    });
    setEvidenceImages([]);
  };

  const handleEvidenceSelection = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selectedFiles.length) return;
    const selectionError = getReceiptEvidenceSelectionError(selectedFiles, evidenceImages);
    if (selectionError) {
      setError(selectionError);
      return;
    }
    setError('');
    setEvidenceImages((current) => [...current, ...selectedFiles]);
  };

  const saveReceipt = async (event) => {
    event.preventDefault();
    if (!canEditReceipts || programEnded) return;
    if (!receiptModal?.date) return;
    if (evidenceImages.length > 0 && evidenceImages.length < 3) {
      setError('Select at least 3 photos or remove the selected photos to save without documentation.');
      return;
    }
    setSavingReceipt(true);
    setError('');
    try {
      const targets = isClusterHistory
        ? clusterRecipients.filter((recipient) => selectedRecipientKeys.includes(getRecipientKey(recipient)))
        : [{ id: beneficiaryId, type: beneficiaryType }].filter(isValidRecipient);
      if (!targets.length) throw new Error(isClusterHistory ? 'Select at least one beneficiary in this group or batch.' : 'Beneficiary ID and type are required.');

      await Promise.all(targets.map((target) => apiSetBeneficiaryMonitoring(programId, {
        beneficiaryId: target.id,
        beneficiaryType: target.type,
        date: receiptModal.date,
        monitored: receiptModal.monitored,
      })));
      if (evidenceImages.length) {
        try {
          await apiUploadProgramReceiptEvidence(programId, receiptModal.date, targets, evidenceImages);
        } catch (evidenceError) {
          throw new Error(`Receipt status was saved, but photo documentation could not be saved: ${evidenceError.message}`);
        }
      }

      setMonitorDate(receiptModal.date);
      setSelectedDate(receiptModal.monitored ? receiptModal.date : null);
      setReceiptModal(null);
      setEvidenceImages([]);
      const targetNames = targets.map((target) => isClusterHistory
        ? clusterRecipients.find((recipient) => getRecipientKey(recipient) === getRecipientKey(target))?.name
        : beneficiaryName).filter(Boolean);
      const receiptCount = targets.length;
      const receiptLabel = receiptCount === 1 ? 'beneficiary' : 'beneficiaries';
      notifyAction(`${formatDateForDisplay(receiptModal.date)} · ${receiptCount} ${receiptLabel} marked ${receiptModal.monitored ? 'received' : 'not received'}${targetNames.length ? `: ${targetNames.join(', ')}` : ''}.`);
      await loadHistory();
    } catch (saveError) {
      if (saveError.status === 409) setProgramEnded(true);
      const message = saveError.message || 'Unable to save receipt status.';
      setError(message);
      notifyAction(message, 'error');
    } finally {
      setSavingReceipt(false);
    }
  };

  const removeEvidenceImage = async () => {
    if (!pendingEvidenceDelete || savingReceipt) return;
    if (programEnded) return;
    setSavingReceipt(true);
    setError('');
    try {
      await apiDeleteProgramReceiptEvidenceImage(
        programId,
        pendingEvidenceDelete.image.set_id,
        pendingEvidenceDelete.image.id,
      );
      setReportRows((current) => current.map((row) => ({
        ...row,
        evidence_images: (row.evidence_images || []).filter(
          (image) => String(image.id) !== String(pendingEvidenceDelete.image.id),
        ),
      })));
      setPendingEvidenceDelete(null);
    } catch (deleteError) {
      if (deleteError.status === 409) setProgramEnded(true);
      console.error('[ReceiptHistoryPage] Unable to remove program check-in photo:', deleteError);
      setError(deleteError.message || 'Unable to remove project check-in photo.');
    } finally {
      setSavingReceipt(false);
    }
  };

  return (
    <div className="community-page program-page">
      <PageHeader
        title="Receipt History"
        breadcrumbs={[{ label: 'Projects', href: `/program/${programId}` }, { label: beneficiaryName }]}
      />
      <section className="program-monitoring-report program-receipt-history-page" aria-labelledby="receipt-history-title">
        <div className="program-monitoring-report__header">
          <div>
            <p className="program-section-eyebrow">Receipt history</p>
            <h2 id="receipt-history-title">{beneficiaryName}</h2>
          </div>
          <button type="button" className="view-btn view-btn--secondary back-action" onClick={() => navigateBack(navigate, location, fallbackReturnTo)}>Back to project</button>
        </div>
        {!loading && <div className="program-receipt-controls">
          <div className="program-receipt-controls-actions">{canEditReceipts && !programEnded && <button type="button" className="view-btn view-btn--primary" onClick={() => openReceiptModal()} disabled={isClusterHistory && recipientsLoading}>Record receipt</button>}<div className="program-view-toggle" role="tablist" aria-label="Receipt history view"><button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List View</button><button type="button" className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>Calendar View</button></div></div>
          {programEnded && <p className="program-receipt-readonly-notice" role="status">This project has ended. Receipt history is read-only.</p>}
        </div>}
        {error && <p className="error-message" role="alert">{error}</p>}
        {loading ? <p>Loading receipt history...</p> : view === 'list' ? (
          <ReceiptHistoryTable
            rows={filteredRows}
            isClusterHistory={isClusterHistory}
            showAuditSignatures={showAuditSignatures}
            canEditReceipts={canEditReceipts}
            canManageEvidence={canManageEvidence}
            programEnded={programEnded}
            expandedEvidenceRow={expandedEvidenceRow}
            setExpandedEvidenceRow={setExpandedEvidenceRow}
            setPreviewImage={setPreviewImage}
            setPendingEvidenceDelete={setPendingEvidenceDelete}
            openReceiptModal={openReceiptModal}
          />
        ) : (
          <ReceiptHistoryCalendar
            calendarMonth={calendarMonth}
            setCalendarMonth={setCalendarMonth}
            receivedByDate={receivedByDate}
            selectedDate={selectedDate}
            openReceiptModal={openReceiptModal}
            canEditReceipts={canEditReceipts}
            programEnded={programEnded}
          />
        )}
        {canEditReceipts && !programEnded && (
          <ReceiptEntryModal
            receiptModal={receiptModal}
            setReceiptModal={setReceiptModal}
            savingReceipt={savingReceipt}
            saveReceipt={saveReceipt}
            isClusterHistory={isClusterHistory}
            clusterType={clusterType}
            clusterRecipients={clusterRecipients}
            recipientsLoading={recipientsLoading}
            selectedRecipientKeys={selectedRecipientKeys}
            setSelectedRecipientKeys={setSelectedRecipientKeys}
            getRecipientKey={getRecipientKey}
            canManageEvidence={canManageEvidence}
            evidenceImages={evidenceImages}
            handleEvidenceSelection={handleEvidenceSelection}
            setPreviewImage={setPreviewImage}
            setEvidenceImages={setEvidenceImages}
            error={error}
          />
        )}
        <ConfirmDialog
          open={Boolean(pendingEvidenceDelete)}
          title="Remove this check-in photo?"
          description={`Permanently remove ${pendingEvidenceDelete?.image?.file_name || 'this photo'} from the program check-in documentation?`}
          confirmLabel="Remove photo"
          loadingLabel="Removing..."
          loading={savingReceipt}
          onConfirm={removeEvidenceImage}
          onCancel={() => setPendingEvidenceDelete(null)}
        />
        <UnifiedModal
          isOpen={Boolean(previewImage)}
          title={previewImage?.name || 'Image preview'}
          size="xl"
          className="batch-documentation-image-viewer"
          backdropClassName="batch-documentation-image-viewer-backdrop"
          onClose={() => setPreviewImage(null)}
          footer={null}
        >
          {previewImage && (
            <img className="batch-documentation-image-viewer-image" src={previewImage.src} alt={previewImage.name} />
          )}
        </UnifiedModal>
      </section>
    </div>
  );
}
