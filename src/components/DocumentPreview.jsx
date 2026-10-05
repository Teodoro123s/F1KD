import React, { useEffect, useState } from 'react';
import { fetchWithAuth, getApiBaseUrl, resolveAssetUrl } from '../api/authHeader';

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

export function DocumentPreview({ fileName, filePath, label, onPreviewOpen }) {
  const previewType = getPreviewType(filePath);
  const { previewUrl, loading, error } = useAuthenticatedPreviewUrl(filePath);

  if (!fileName || !filePath) {
    return <span className="document-upload-empty">No document uploaded</span>;
  }

  if (previewType === 'none') {
    const fileUrl = resolveAssetUrl(filePath);
    return <a href={fileUrl} target="_blank" rel="noreferrer">{fileName}</a>;
  }

  return (
    <div className="document-upload-preview-wrapper">
      <button
        type="button"
        className="document-upload-preview-button"
        onClick={() => onPreviewOpen?.(resolveAssetUrl(filePath), fileName, previewType)}
        aria-label={`Preview ${label || fileName}`}
      >
        {previewType === 'image' && previewUrl && (
          <img src={previewUrl} alt={fileName || label} className="document-upload-preview-image" />
        )}
        {previewType === 'pdf' && previewUrl && (
          <div className="document-upload-preview-pdf-shell">
            <object data={previewUrl} type="application/pdf" className="document-upload-preview-pdf">
              <span>{fileName}</span>
            </object>
          </div>
        )}
        {!previewUrl && (
          <span className="document-upload-empty">
            {loading ? 'Loading preview...' : error ? 'Preview unavailable' : fileName}
          </span>
        )}
      </button>
      <button
        type="button"
        className="document-upload-filename-link"
        onClick={() => onPreviewOpen?.(resolveAssetUrl(filePath), fileName, previewType)}
      >
        {fileName}
      </button>
    </div>
  );
}

export function DocumentPreviewModal({ document, onClose }) {
  const { previewUrl, loading, error } = useAuthenticatedPreviewUrl(document?.url);
  if (!document) return null;

  return (
    <div className="document-preview-modal-backdrop" onClick={onClose}>
      <div
        className="document-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${document.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="document-preview-modal-header">
          <strong>{document.name}</strong>
          <button type="button" className="document-preview-close" onClick={onClose}>Close</button>
        </div>
        {loading && <p className="document-preview-status" role="status">Loading file preview...</p>}
        {error && <p className="document-preview-error" role="alert">{error}</p>}
        {previewUrl && (document.type === 'image' ? (
          <img src={previewUrl} alt={document.name} className="document-preview-modal-image" />
        ) : (
          <iframe src={previewUrl} title={document.name} className="document-preview-modal-frame" />
        ))}
      </div>
    </div>
  );
}
