import { fetchWithAuth, getApiBaseUrl, resolveAssetUrl } from './authHeader';
import { readApiResponse } from './readApiResponse.mjs';

const API_BASE = getApiBaseUrl();

export async function apiGetBatchDocumentations(batchId) {
  const response = await fetchWithAuth(
    `${API_BASE}/api/community/batches/${encodeURIComponent(batchId)}/documentations`,
    { headers: { 'Content-Type': 'application/json' } },
  );
  return readApiResponse(response, 'Unable to load batch documentation');
}

export async function apiUploadBatchDocumentation(batchId, evidenceDate, images) {
  const formData = new FormData();
  formData.append('evidenceDate', evidenceDate);
  images.forEach((image) => formData.append('images', image));
  const response = await fetchWithAuth(
    `${API_BASE}/api/community/batches/${encodeURIComponent(batchId)}/documentations`,
    { method: 'POST', headers: {}, body: formData },
  );
  return readApiResponse(response, 'Unable to upload batch documentation');
}

export async function apiDeleteBatchDocumentationImage(batchId, documentationId, imageId) {
  const response = await fetchWithAuth(
    `${API_BASE}/api/community/batches/${encodeURIComponent(batchId)}/documentations/${encodeURIComponent(documentationId)}/images/${encodeURIComponent(imageId)}`,
    { method: 'DELETE', headers: { 'Content-Type': 'application/json' } },
  );
  return readApiResponse(response, 'Unable to delete batch documentation image');
}

export async function apiGetBatchDocumentationImage(filePath) {
  const response = await fetchWithAuth(resolveAssetUrl(filePath));
  if (!response.ok) {
    await readApiResponse(response, 'Unable to load batch evidence image');
  }
  return response.blob();
}
