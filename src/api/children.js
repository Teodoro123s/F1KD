import { authHeader, fetchWithAuth, getApiBaseUrl, resolveAssetUrl } from './authHeader';
import { readApiResponse } from './readApiResponse.mjs';

const API_BASE = getApiBaseUrl();

export async function apiCreateChild(payload) {
  const res = await fetchWithAuth(`${API_BASE}/api/children`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readApiResponse(res, 'Unable to create child');
}

export async function apiUpdateChild(idOrCode, payload) {
  const res = await fetchWithAuth(`${API_BASE}/api/children/${encodeURIComponent(idOrCode)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readApiResponse(res, 'Unable to update child');
}

export async function apiDeleteChild(idOrCode) {
  const res = await fetchWithAuth(`${API_BASE}/api/children/${encodeURIComponent(idOrCode)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  return readApiResponse(res, 'Unable to delete child');
}

export async function apiGetChild(idOrCode) {
  const res = await fetchWithAuth(`${API_BASE}/api/children/${encodeURIComponent(idOrCode)}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  return readApiResponse(res, 'Unable to load child');
}

export async function apiGetChildren(fields = []) {
  const params = new URLSearchParams();
  if (Array.isArray(fields) && fields.length) {
    params.set('fields', fields.join(','));
  }
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await fetchWithAuth(`${API_BASE}/api/children${queryString}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  return readApiResponse(res, 'Unable to load children');
}

export async function apiGetChildrenByMother(motherId) {
  const res = await fetchWithAuth(`${API_BASE}/api/children/mother/${encodeURIComponent(motherId)}/children`, {
    headers: { 'Content-Type': 'application/json' },
  });
  return readApiResponse(res, 'Unable to load children for this mother');
}

export async function apiSaveChildCheckup(childId, payload) {
  const res = await fetchWithAuth(`${API_BASE}/api/children/${encodeURIComponent(childId)}/checkups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readApiResponse(res, 'Unable to save child check-up');
}

export async function apiUploadChildBirthDocument(childId, file) {
  const formData = new FormData();
  formData.append('birthDocument', file);
  const res = await fetchWithAuth(`${API_BASE}/api/children/${encodeURIComponent(childId)}/documents`, {
    method: 'POST',
    headers: {},
    body: formData,
  });
  return readApiResponse(res, 'Unable to upload child birth document');
}
