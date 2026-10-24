import React, { useEffect, useState } from 'react';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import FieldInfoTooltip from '../../../components/ui/FieldInfoTooltip';
import UnifiedModal from '../../../components/ui/UnifiedModal';
import {
  apiDeleteBatchDocumentationImage,
  apiGetBatchDocumentationImage,
  apiGetBatchDocumentations,
  apiUploadBatchDocumentation,
} from '../../../api/batchDocumentations';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_IMAGE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_COUNT = 10;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function getToday() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
}

function formatImageSize(size) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function EvidenceImage({ filePath, fileName, canManage, onPreview, onRemove }) {
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setError('');
    setImageUrl('');

    apiGetBatchDocumentationImage(filePath)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch((loadError) => {
        console.error('[BatchDocumentationPanel] Unable to load evidence image:', loadError);
        if (active) setError(loadError.message || 'Unable to load image');
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [filePath]);

  return (
    <figure className="batch-documentation-photo">
      {error ? (
        <div className="batch-documentation-image-error" role="img" aria-label={`${fileName}: ${error}`}>
          Image unavailable
        </div>
      ) : !imageUrl ? (
        <div className="batch-documentation-image-loading" aria-label={`Loading ${fileName}`}>
          Loading image...
        </div>
      ) : (
        <button
          type="button"
          className="batch-documentation-preview-trigger batch-documentation-evidence-preview-trigger"
          onClick={() => onPreview({ src: imageUrl, name: fileName })}
          aria-label={`View ${fileName} full size`}
        >
          <img className="batch-documentation-image" src={imageUrl} alt="" />
          <span className="batch-documentation-preview-indicator" aria-hidden="true">
            <svg viewBox="0 0 20 20" focusable="false">
              <path d="M7 3H3v4M13 3h4v4M17 13v4h-4M3 13v4h4" />
            </svg>
          </span>
        </button>
      )}
      <figcaption className="batch-documentation-photo-caption">
        <span title={fileName}>{fileName}</span>
        <div className="batch-documentation-photo-actions">
          {imageUrl && (
            <a
              className="batch-documentation-download"
              href={imageUrl}
              download={fileName}
              aria-label={`Download ${fileName}`}
              title={`Download ${fileName}`}
            >
              Download
            </a>
          )}
          {canManage && (
            <button
              type="button"
              className="batch-documentation-remove-photo"
              onClick={onRemove}
              aria-label={`Remove ${fileName}`}
              title={`Remove ${fileName}`}
            >
              <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                <path d="M4 6h12M8 6V4h4v2m3 0-.7 10H5.7L5 6m3 3v4m4-4v4" />
              </svg>
            </button>
          )}
        </div>
      </figcaption>
    </figure>
  );
}

export function SelectedImagePreview({ image, onPreview }) {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(image);
    setImageUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  return imageUrl
    ? (
      <button
        type="button"
        className="batch-documentation-preview-trigger"
        onClick={() => onPreview({ src: imageUrl, name: image.name })}
        aria-label={`View ${image.name} full size`}
      >
        <img className="batch-documentation-selected-preview" src={imageUrl} alt="" />
      </button>
    )
    : <span className="batch-documentation-selected-preview-placeholder" aria-hidden="true">Loading preview...</span>;
}

export default function BatchDocumentationPanel({
  batchId,
  visible,
  canManage,
  onCountChange,
  onLoadingChange,
}) {
  const [documentations, setDocumentations] = useState([]);
  const [evidenceDate, setEvidenceDate] = useState(getToday);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const handleImageSelection = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selectedFiles.length) return;
    const oversizedImage = selectedFiles.find((image) => image.size > MAX_IMAGE_SIZE_BYTES);
    if (oversizedImage) {
      setError(`${oversizedImage.name} exceeds the 5 MB per-photo limit.`);
      return;
    }
    const unsupportedImage = selectedFiles.find((image) => !ALLOWED_IMAGE_TYPES.includes(image.type));
    if (unsupportedImage) {
      setError(`${unsupportedImage.name} is not a supported image. Choose JPG, PNG, or WEBP.`);
      return;
    }
    if (images.length + selectedFiles.length > MAX_IMAGE_COUNT) {
      setError('Choose no more than 10 photos for one documentation entry.');
      return;
    }
    const selectedSize = images.reduce((total, image) => total + image.size, 0)
      + selectedFiles.reduce((total, image) => total + image.size, 0);
    if (selectedSize > MAX_TOTAL_IMAGE_SIZE_BYTES) {
      setError('The combined photo size must not exceed 25 MB.');
      return;
    }
    setError('');
    setImages((current) => [...current, ...selectedFiles]);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    onLoadingChange(true);
    setError('');

    apiGetBatchDocumentations(batchId)
      .then((response) => {
        if (!active) return;
        const rows = Array.isArray(response.documentations) ? response.documentations : [];
        setDocumentations(rows);
        onCountChange(rows.length);
      })
      .catch((loadError) => {
        console.error('[BatchDocumentationPanel] Unable to load batch documentation:', loadError);
        if (active) {
          setError(loadError.message || 'Unable to load batch documentation.');
          onCountChange(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          onLoadingChange(false);
        }
      });

    return () => { active = false; };
  }, [batchId, onCountChange, onLoadingChange]);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (images.length < 3 || images.length > MAX_IMAGE_COUNT || submitting) return;
    if (images.some((image) => image.size > MAX_IMAGE_SIZE_BYTES)) {
      setError('Each photo must be 5 MB or smaller.');
      return;
    }
    if (images.reduce((total, image) => total + image.size, 0) > MAX_TOTAL_IMAGE_SIZE_BYTES) {
      setError('The combined photo size must not exceed 25 MB.');
      return;
    }
    const form = event.currentTarget;
    setSubmitting(true);
    setError('');

    try {
      const response = await apiUploadBatchDocumentation(batchId, evidenceDate, images);
      const nextRows = [response.documentation, ...documentations];
      setDocumentations(nextRows);
      onCountChange(nextRows.length);
      setImages([]);
      setEvidenceDate(getToday());
      form.reset();
    } catch (uploadError) {
      console.error('[BatchDocumentationPanel] Unable to upload batch evidence:', uploadError);
      setError(uploadError.message || 'Unable to upload batch evidence.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await apiDeleteBatchDocumentationImage(
        batchId,
        pendingDelete.documentation.id,
        pendingDelete.image.id,
      );
      const nextRows = documentations.flatMap((item) => {
        if (String(item.id) !== String(pendingDelete.documentation.id)) return [item];
        const remainingImages = item.images.filter(
          (image) => String(image.id) !== String(pendingDelete.image.id),
        );
        return remainingImages.length ? [{ ...item, images: remainingImages }] : [];
      });
      setDocumentations(nextRows);
      onCountChange(nextRows.length);
      setPendingDelete(null);
    } catch (deleteError) {
      console.error('[BatchDocumentationPanel] Unable to delete batch evidence:', deleteError);
      setError(deleteError.message || 'Unable to delete batch evidence.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <section className="batch-documentation-panel" aria-labelledby="batch-documentation-title">
      <header className="batch-documentation-header">
        <div>
          <h2 id="batch-documentation-title">Batch documentation</h2>
          <p>Optional dated photo evidence to help verify this batch exists.</p>
        </div>
      </header>

      {canManage && (
        <form className="batch-documentation-form" onSubmit={handleUpload}>
          <label>
            Evidence date
            <input
              type="date"
              value={evidenceDate}
              onChange={(event) => setEvidenceDate(event.target.value)}
              required
            />
          </label>
          <label>
            <span className="batch-documentation-photo-label">
              Photos (minimum 3)
              <FieldInfoTooltip content="Select 3-10 photos in JPG, PNG, or WEBP format. Each photo can be up to 5 MB, with a 25 MB total limit per entry. You can add photos in multiple selections." />
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              aria-describedby="batch-documentation-selection"
              onChange={handleImageSelection}
            />
          </label>
          <button
            type="submit"
            className="btn-primary"
            disabled={images.length < 3 || images.length > MAX_IMAGE_COUNT || submitting}
            title={images.length < 3 ? `Select ${3 - images.length} more photos` : undefined}
          >
            {submitting ? 'Saving...' : 'Add evidence'}
          </button>
          <p id="batch-documentation-selection" className="batch-documentation-selection" role="status">
            {images.length === 0
              ? 'No photos selected - choose 3-10 photos (5 MB each, 25 MB total).'
              : `${images.length} photo${images.length === 1 ? '' : 's'} selected - ${formatImageSize(images.reduce((total, image) => total + image.size, 0))} of 25 MB total${images.length < 3
                ? ` - select ${3 - images.length} more`
                : ''}`}
          </p>
          {images.length > 0 && (
            <ul className="batch-documentation-selected-files" aria-label="Selected photos">
              {images.map((image, index) => (
                <li key={`${image.name}-${image.size}-${image.lastModified}-${index}`}>
                  <SelectedImagePreview image={image} onPreview={setPreviewImage} />
                  <span className="batch-documentation-selected-file-info">
                    <span className="batch-documentation-selected-file-name" title={image.name}>{image.name}</span>
                    <small>{formatImageSize(image.size)}</small>
                  </span>
                  <button
                    type="button"
                    className="batch-documentation-remove-file"
                    onClick={() => setImages((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                    aria-label={`Remove ${image.name}`}
                    disabled={submitting}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
      )}

      {error && <p className="error-message" role="alert">{error}</p>}
      {loading ? (
        <p className="batch-documentation-empty">Loading batch documentation...</p>
      ) : documentations.length === 0 ? (
        <p className="batch-documentation-empty">No evidence has been added. Documentation is optional.</p>
      ) : (
        <div className="batch-documentation-grid">
          {documentations.map((item) => (
            <article className="batch-documentation-item" key={item.id}>
              <div className="batch-documentation-image-grid">
                {(item.images || []).map((image) => (
                  <EvidenceImage
                    key={image.id}
                    filePath={image.file_path}
                    fileName={image.file_name}
                    canManage={canManage}
                    onPreview={setPreviewImage}
                    onRemove={() => setPendingDelete({ documentation: item, image })}
                  />
                ))}
              </div>
              <div className="batch-documentation-item-details">
                <strong>{item.images?.length || 0} photos</strong>
                <span>Evidence date: {new Date(`${item.evidence_date}T00:00:00`).toLocaleDateString()}</span>
                {item.uploaded_by && <span>Added by {item.uploaded_by}</span>}
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Remove this photo?"
        description={`Permanently remove ${pendingDelete?.image?.file_name || 'this photo'} from the batch documentation?`}
        confirmLabel="Remove photo"
        loadingLabel="Removing..."
        loading={submitting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
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
  );
}
