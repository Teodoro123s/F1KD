import React, { useEffect, useRef, useState } from 'react';
import { fetchWithAuth, getApiBaseUrl, resolveAssetUrl } from '../api/authHeader';
import Button from './ui/Button';
import ConfirmDialog from './ui/ConfirmDialog';
import useModalAccessibility from './ui/useModalAccessibility';

function getPreviewType(filePath = '') {
  const normalizedPath = String(filePath || '').toLowerCase();
  if (normalizedPath.endsWith('.pdf')) return 'pdf';
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(normalizedPath)) return 'image';
  return 'none';
}

function useAuthenticatedPreviewUrl(filePath) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(Boolean(filePath));
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    const sourceUrl = filePath ? resolveAssetUrl(filePath) : '';
    setPreviewUrl('');
    setError('');
    setLoading(Boolean(sourceUrl));

    if (!sourceUrl) return undefined;

    const loadPreview = async () => {
      try {
        const target = new URL(sourceUrl, window.location.href);
        const apiOrigin = new URL(getApiBaseUrl(), window.location.origin).origin;
        const response = target.origin === apiOrigin
          ? await fetchWithAuth(target.toString())
          : await fetch(target.toString());
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || `Unable to load file (${response.status})`);
        }

        const fileBlob = await response.blob();
        objectUrl = URL.createObjectURL(fileBlob);
        if (active) setPreviewUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load file preview.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPreview();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filePath]);

  return { previewUrl, loading, error };
}

async function downloadAuthenticatedFile(filePath, fileName) {
  const url = resolveAssetUrl(filePath);
  const target = new URL(url, window.location.href);
  const apiOrigin = new URL(getApiBaseUrl(), window.location.origin).origin;
  const response = target.origin === apiOrigin
    ? await fetchWithAuth(target.toString())
    : await fetch(target.toString());
  if (!response.ok) throw new Error(`Unable to download file (${response.status})`);
  const objectUrl = URL.createObjectURL(await response.blob());
  const anchor = window.document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function DocumentPreview({
  fileName,
  filePath,
  label,
  onPreviewOpen,
  canReplace = false,
  canRemove = false,
  onReplace,
  onRemove,
  status,
}) {
  const previewType = getPreviewType(filePath);
  const { previewUrl, loading, error } = useAuthenticatedPreviewUrl(filePath);
  const fileInput = useRef(null);
  const [actionError, setActionError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const hasDocument = Boolean(fileName && filePath);
  const resolvedStatus = status || (hasDocument ? 'Uploaded' : 'Missing');
  const statusClass = String(resolvedStatus).toLowerCase().replace(/[^a-z0-9-]+/g, '-');

  const downloadDocument = async () => {
    setActionError('');
    setIsProcessing(true);
    try {
      await downloadAuthenticatedFile(filePath, fileName);
    } catch (downloadError) {
      setActionError(downloadError.message || 'Unable to download document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const replaceDocument = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onReplace) return;
    setActionError('');
    setIsProcessing(true);
    try {
      await onReplace(file);
    } catch (replaceError) {
      setActionError(replaceError.message || 'Unable to upload document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const requestRemoveDocument = () => {
    setRemoveError('');
    setShowRemoveConfirm(true);
  };

  const removeDocument = async () => {
    if (!onRemove) return;
    setRemoveError('');
    setIsProcessing(true);
    try {
      await onRemove();
      setShowRemoveConfirm(false);
    } catch (removeError) {
      setRemoveError(removeError.message || 'Unable to remove document.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <article className="profile-document-card">
      <div className="profile-document-heading">
        <h4 className="profile-document-title" title={label} aria-label={label}>{label}</h4>
        <span className={`profile-document-status is-${statusClass}`}>
          {resolvedStatus}
        </span>
      </div>

      {hasDocument ? (
        <>
          <button
            type="button"
            className={`profile-document-preview ${previewType === 'image' && previewUrl ? 'has-image' : ''}`}
            onClick={() => onPreviewOpen?.(resolveAssetUrl(filePath), fileName, previewType)}
            aria-label={`View ${label || fileName}`}
            title={`View ${label || fileName}`}
          >
            {previewType === 'image' && previewUrl
                ? <img src={previewUrl} alt="" className="profile-document-image" />
                : <span className="profile-document-file-icon" aria-hidden="true"><b>{previewType === 'pdf' ? 'PDF' : 'FILE'}</b></span>}
            {loading && <span className="profile-document-preview-note" role="status">Loading preview…</span>}
            {(error || (previewType === 'image' && !previewUrl && !loading)) && <span className="profile-document-preview-note">Preview unavailable</span>}
          </button>
          <p className="profile-document-filename" title={fileName}>{fileName}</p>
        </>
      ) : (
        <div className="profile-document-empty">
          <span className="profile-document-empty-icon" aria-hidden="true">+</span>
          <p>No document uploaded yet.</p>
        </div>
      )}

      <div className="profile-document-actions" aria-label={`${label || 'Document'} actions`}>
        {hasDocument && (
          <>
            <Button
              type="button"
              variant="primary"
              size="small"
              className="profile-document-action is-primary"
              onClick={() => onPreviewOpen?.(resolveAssetUrl(filePath), fileName, previewType)}
            >
              View
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="small"
              className="profile-document-action"
              onClick={downloadDocument}
              loading={isProcessing}
              loadingLabel="Downloading..."
            >
              Download
            </Button>
          </>
        )}
        {canReplace && onReplace && (
          <>
            <input
              ref={fileInput}
              className="profile-document-file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={replaceDocument}
              aria-label={`Upload ${label || 'document'}`}
            />
            <Button
              type="button"
              variant="secondary"
              size="small"
              className="profile-document-action"
              onClick={() => fileInput.current?.click()}
              disabled={isProcessing}
            >
              {hasDocument ? 'Replace' : 'Upload'}
            </Button>
          </>
        )}
        {hasDocument && canRemove && onRemove && (
          <Button
            type="button"
            variant="destructive"
            size="small"
            className="profile-document-action is-danger"
            onClick={requestRemoveDocument}
            disabled={isProcessing}
          >
            Remove
          </Button>
        )}
      </div>
      {isProcessing && <p className="profile-document-feedback" role="status">Processing document…</p>}
      {actionError && <p className="profile-document-feedback is-error" role="alert">{actionError}</p>}
      <ConfirmDialog
        open={showRemoveConfirm}
        title="Remove uploaded document?"
        description={`Remove ${label || 'this document'} from this beneficiary profile?`}
        variant="destructive"
        confirmLabel="Remove document"
        loadingLabel="Removing document..."
        loading={isProcessing}
        error={removeError}
        onConfirm={removeDocument}
        onCancel={() => {
          if (!isProcessing) {
            setShowRemoveConfirm(false);
            setRemoveError('');
          }
        }}
      />
    </article>
  );
}

export function DocumentPreviewModal({ document, onClose }) {
  const { previewUrl, loading, error } = useAuthenticatedPreviewUrl(document?.type === 'image' ? document?.url : '');
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  useModalAccessibility({
    open: Boolean(document),
    onClose,
    dialogRef,
    initialFocusRef: closeButtonRef,
    closeDisabled: downloading,
  });

  if (!document) return null;

  const downloadDocument = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadAuthenticatedFile(document.url, document.name);
    } catch (downloadFailure) {
      setDownloadError(downloadFailure.message || 'Unable to download document.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="document-preview-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !downloading) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        className="document-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${document.name}`}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="document-preview-modal-header">
          <strong>{document.name}</strong>
          <Button ref={closeButtonRef} type="button" variant="secondary" className="document-preview-close" onClick={onClose} disabled={downloading}>
            Close
          </Button>
        </div>
        {loading && <p className="document-preview-status" role="status">Loading file preview...</p>}
        {error && <p className="document-preview-error" role="alert">{error}</p>}
        {previewUrl && document.type === 'image' ? (
          <img src={previewUrl} alt={document.name} className="document-preview-modal-image" />
        ) : null}
        {document.type === 'pdf' && (
          <div className="document-preview-modal-pdf">
            <span className="profile-document-file-icon" aria-hidden="true"><b>PDF</b></span>
            <p>PDF preview is not available here. Download the file to view it.</p>
            <Button
              type="button"
              variant="primary"
              className="profile-document-action is-primary"
              onClick={downloadDocument}
              loading={downloading}
              loadingLabel="Downloading..."
            >
              Download PDF
            </Button>
            {downloadError && <p className="profile-document-feedback is-error" role="alert">{downloadError}</p>}
          </div>
        )}
        {previewUrl && document.type === 'none' && (
          <div className="document-preview-modal-pdf">
            <span className="profile-document-file-icon" aria-hidden="true"><b>FILE</b></span>
            <p>Preview is not available for this file type.</p>
          </div>
        )}
      </div>
    </div>
  );
}
