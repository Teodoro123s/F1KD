import { getReceiptRecipientKey as getProgramReceiptRecipientKey } from './programData.js';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_TOTAL_IMAGE_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_COUNT = 10;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const toDateKey = (value) => String(value || '').slice(0, 10);
export const normalizeScopeValue = (value) => String(value || '').trim().toLowerCase();
export const getRecipientKey = getProgramReceiptRecipientKey;
export const isValidRecipient = (recipient) => String(recipient?.id || '').trim() !== ''
  && ['mother', 'child'].includes(String(recipient?.type || '').toLowerCase());
export const monthLabel = (date) => date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
export const formatImageSize = (size) => size < 1024 * 1024
  ? `${Math.max(1, Math.round(size / 1024))} KB`
  : `${(size / (1024 * 1024)).toFixed(1)} MB`;
export const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
export const calendarDays = (date) => {
  const first = startOfMonth(date);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
};

export const getReceivedReceiptsByDate = (rows) => {
  const receivedByDate = new Map();
  rows.filter((row) => row.monitored).forEach((row) => {
    const key = toDateKey(row.date);
    const existing = receivedByDate.get(key) || [];
    const beneficiaryKey = row.beneficiary_key || `${row.beneficiary_type || ''}:${row.beneficiary_id || row.beneficiary_name || ''}`;
    if (!existing.some((receipt) => (
      (receipt.beneficiary_key || `${receipt.beneficiary_type || ''}:${receipt.beneficiary_id || receipt.beneficiary_name || ''}`) === beneficiaryKey
    ))) {
      existing.push(row);
    }
    receivedByDate.set(key, existing);
  });
  return receivedByDate;
};

export const getReceiptEvidenceSelectionError = (selectedFiles, existingFiles) => {
  const oversizedImage = selectedFiles.find((image) => image.size > MAX_IMAGE_SIZE_BYTES);
  if (oversizedImage) return `${oversizedImage.name} exceeds the 5 MB per-photo limit.`;

  const unsupportedImage = selectedFiles.find((image) => !ALLOWED_IMAGE_TYPES.includes(image.type));
  if (unsupportedImage) return `${unsupportedImage.name} is not a supported image. Choose JPG, PNG, or WEBP.`;

  if (existingFiles.length + selectedFiles.length > MAX_IMAGE_COUNT) {
    return 'Choose no more than 10 photos for one check-in.';
  }

  const totalSize = [...existingFiles, ...selectedFiles].reduce((total, image) => total + image.size, 0);
  if (totalSize > MAX_TOTAL_IMAGE_SIZE_BYTES) {
    return 'The combined photo size must not exceed 25 MB.';
  }
  return '';
};
