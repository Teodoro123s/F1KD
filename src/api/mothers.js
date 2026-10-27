import { authHeader, fetchWithAuth, getApiBaseUrl, resolveAssetUrl } from './authHeader';
import { readApiResponse } from './readApiResponse.mjs';

const API_BASE = getApiBaseUrl();

export async function apiGetMothers(fields = []) {
  const params = new URLSearchParams();
  if (Array.isArray(fields) && fields.length) {
    params.set('fields', fields.join(','));
  }
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await fetchWithAuth(`${API_BASE}/api/mothers${queryString}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  return readApiResponse(res, 'Unable to load mothers');
}

export async function apiUpdateMother(motherId, payload) {
  const id = encodeURIComponent(motherId);
  const res = await fetchWithAuth(`${API_BASE}/api/mothers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readApiResponse(res, 'Unable to update mother');
}

export async function apiCreateMother(payload) {
  const res = await fetchWithAuth(`${API_BASE}/api/mothers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readApiResponse(res, 'Unable to create mother');
}

export async function apiGetMother(motherId) {
  const id = encodeURIComponent(motherId);
  const res = await fetchWithAuth(`${API_BASE}/api/mothers/${id}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  return readApiResponse(res, 'Unable to load mother');
}

export async function apiGetMotherClaims(motherId) {
  const id = encodeURIComponent(motherId);
  const res = await fetchWithAuth(`${API_BASE}/api/mothers/${id}/claims`, {
    headers: { 'Content-Type': 'application/json' },
  });
  return readApiResponse(res, 'Unable to load PhilHealth claims');
}

export async function apiCreateMotherClaim(motherId, payload) {
  const id = encodeURIComponent(motherId);
  const res = await fetchWithAuth(`${API_BASE}/api/mothers/${id}/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readApiResponse(res, 'Unable to create PhilHealth claim record');
}

export async function apiUpdateMotherClaim(motherId, claimId, payload) {
  const id = encodeURIComponent(motherId);
  const claim = encodeURIComponent(claimId);
  const res = await fetchWithAuth(`${API_BASE}/api/mothers/${id}/claims/${claim}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readApiResponse(res, 'Unable to update PhilHealth claim record');
}

export async function apiDeleteMother(motherId) {
  const id = encodeURIComponent(motherId);
  const res = await fetchWithAuth(`${API_BASE}/api/mothers/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  return readApiResponse(res, 'Unable to delete mother');
}

export async function apiDeleteMotherDocument(motherId, fieldName) {
  const id = encodeURIComponent(motherId);
  const field = String(fieldName || '').replace(/[^a-zA-Z]/g, '');
  const res = await fetchWithAuth(`${API_BASE}/api/mothers/${id}/documents/${field}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  return readApiResponse(res, 'Unable to remove document');
}

export async function apiSaveMotherCheckup(motherId, payload) {
  const id = encodeURIComponent(motherId);
  const res = await fetchWithAuth(`${API_BASE}/api/mothers/${id}/checkups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readApiResponse(res, 'Unable to save mother check-up');
}

export async function apiUploadMotherDocuments(motherId, documents) {
  const formData = new FormData();
  if (documents.birthCertificate) formData.append('birthCertificate', documents.birthCertificate);
  if (documents.consent) formData.append('consent', documents.consent);
  const res = await fetchWithAuth(`${API_BASE}/api/mothers/${encodeURIComponent(motherId)}/documents`, {
    method: 'POST',
    headers: {},
    body: formData,
  });
  return readApiResponse(res, 'Unable to upload mother documents');
}
