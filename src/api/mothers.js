import { authHeader, fetchWithAuth, getApiBaseUrl, resolveAssetUrl } from './authHeader';

const API_BASE = getApiBaseUrl();

async function handleResponse(res, defaultMsg) {
  const contentType = res.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('application/json')) {
    try { body = await res.json(); } catch (e) { body = null; }
  } else {
    try { body = await res.text(); } catch (e) { body = null; }
  }
  if (res.ok) return body;
  const msg = (body && (body.error || body.message)) ? (body.error || body.message) : res.statusText || defaultMsg;
  const err = new Error(msg);
  err.status = res.status;
  err.body = body;
  throw err;
}

export async function apiGetMothers() {
  const res = await fetchWithAuth(`${API_BASE}/api/mothers`, {
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse(res, 'Failed to fetch mothers');
}

export async function apiUpdateMother(motherId, payload) {
  const id = encodeURIComponent(motherId);
  const res = await fetchWithAuth(`${API_BASE}/api/mothers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res, 'Server error when updating mother');
}

export async function apiCreateMother(payload) {
  const res = await fetchWithAuth(`${API_BASE}/api/mothers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res, 'Server error when creating mother');
}

export async function apiGetMother(motherId) {
  const id = encodeURIComponent(motherId);
  const res = await fetchWithAuth(`${API_BASE}/api/mothers/${id}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse(res, 'Failed to fetch mother');
}

export async function apiDeleteMother(motherId) {
  const id = encodeURIComponent(motherId);
  const res = await fetchWithAuth(`${API_BASE}/api/mothers/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse(res, 'Unable to delete mother');
}

export async function apiDeleteMotherDocument(motherId, fieldName) {
  const id = encodeURIComponent(motherId);
  const field = String(fieldName || '').replace(/[^a-zA-Z]/g, '');
  const res = await fetchWithAuth(`${API_BASE}/api/mothers/${id}/documents/${field}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse(res, 'Unable to remove document');
}

export async function apiSaveMotherCheckup(motherId, payload) {
  const id = encodeURIComponent(motherId);
  const res = await fetchWithAuth(`${API_BASE}/api/mothers/${id}/checkups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res, 'Server error when saving mother check-up');
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
  return handleResponse(res, 'Unable to upload mother documents');
}
