import React, { useEffect, useRef, useState } from 'react';
import useModalAccessibility from './useModalAccessibility';

const formatFileSize = (size) => {
  if (!Number.isFinite(size) || size < 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function FileUploadField({
  id,
  label,
  accept,
  file,
  onChange,
  existingName = '',
}) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const isImage = Boolean(file && (
    file.type?.startsWith('image/')
    || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name)
  ));
  const isPdf = Boolean(file && (
    file.type === 'application/pdf'
    || /\.pdf$/i.test(file.name)
  ));

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useModalAccessibility({
    open: previewOpen && Boolean(file),
    onClose: () => setPreviewOpen(false),
    dialogRef,
    initialFocusRef: closeButtonRef,
  });

  return (
    <>
      <div className="document-upload-field">
        <label className="form-label" htmlFor={id}>{label}</label>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          onChange={(event) => {
            const selectedFile = event.target.files?.[0] || null;
            event.target.value = '';
            onChange(selectedFile);
          }}
          aria-describedby={`${id}-file-status`}
        />
        {existingName && <span className="document-upload-message">Current file: {existingName}</span>}
        <div className="file-upload-preview" id={`${id}-file-status`} aria-live="polite">
          {file ? (
            <>
              <button
                type="button"
                className="file-upload-preview-open"
                onClick={() => setPreviewOpen(true)}
                aria-label={`Preview ${file.name}`}
                title={`Preview ${file.name}`}
              >
                {isImage && previewUrl
                  ? <img className="file-upload-preview-image" src={previewUrl} alt="" />
                  : <span className="file-upload-preview-type" aria-hidden="true">{isPdf ? 'PDF' : 'FILE'}</span>}
                <span className="file-upload-preview-details">
                  <strong title={file.name}>{file.name}</strong>
                  <small>{formatFileSize(file.size)}{isImage ? ' · Image preview' : isPdf ? ' · PDF selected' : ' · File selected'}</small>
                </span>
              </button>
              <button type="button" className="btn-secondary file-upload-remove" onClick={() => {
                if (inputRef.current) inputRef.current.value = '';
                setPreviewOpen(false);
                onChange(null);
              }}>
                Remove
              </button>
            </>
          ) : (
            <span className="file-upload-empty">
              {existingName ? 'Choose a file to replace the current one.' : 'No file selected.'}
            </span>
          )}
        </div>
      </div>
      {previewOpen && file && (
        <div
          className="document-preview-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            className="document-preview-modal file-upload-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Preview ${file.name}`}
            tabIndex={-1}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="document-preview-modal-header">
              <strong>{file.name}</strong>
              <button ref={closeButtonRef} type="button" className="btn-secondary document-preview-close" onClick={() => setPreviewOpen(false)}>
                Close
              </button>
            </div>
            {isImage && previewUrl ? (
              <img src={previewUrl} alt={file.name} className="document-preview-modal-image" />
            ) : isPdf && previewUrl ? (
              <iframe title={`PDF preview: ${file.name}`} src={previewUrl} className="document-preview-modal-frame" />
            ) : (
              <div className="document-preview-modal-pdf">
                <span className="file-upload-preview-type" aria-hidden="true">{isPdf ? 'PDF' : 'FILE'}</span>
                <p>{isPdf ? 'PDF preview is unavailable in this browser.' : 'Preview is not available for this file type.'}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
