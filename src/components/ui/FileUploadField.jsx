import React, { useEffect, useRef, useState } from 'react';

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
  const inputRef = useRef(null);
  const isImage = Boolean(file && (
    file.type?.startsWith('image/')
    || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name)
  ));
  const isPdf = Boolean(file && (
    file.type === 'application/pdf'
    || /\.pdf$/i.test(file.name)
  ));

  useEffect(() => {
    if (!file || !isImage) {
      setPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, isImage]);

  return (
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
            {isImage && previewUrl
              ? <img className="file-upload-preview-image" src={previewUrl} alt={`Preview of ${file.name}`} />
              : <span className="file-upload-preview-type" aria-hidden="true">{isPdf ? 'PDF' : 'FILE'}</span>}
            <span className="file-upload-preview-details">
              <strong title={file.name}>{file.name}</strong>
              <small>{formatFileSize(file.size)}{isImage ? ' · Image preview' : isPdf ? ' · PDF selected' : ' · File selected'}</small>
            </span>
            <button type="button" className="btn-secondary file-upload-remove" onClick={() => {
              if (inputRef.current) inputRef.current.value = '';
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
  );
}
