import { authHeader } from './authHeader';

const API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL)
  ? process.env.REACT_APP_API_URL
  : (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:4000';

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

export async function apiCreateChild(payload) {
  const res = await fetch(`${API_BASE}/api/children`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
  });
  return handleResponse(res, 'Server error when creating child');
}

export async function apiUpdateChild(idOrCode, payload) {
  const res = await fetch(`${API_BASE}/api/children/${encodeURIComponent(idOrCode)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
  });
  return handleResponse(res, 'Server error when updating child');
}

export async function apiGetChild(idOrCode) {
  const res = await fetch(`${API_BASE}/api/children/${encodeURIComponent(idOrCode)}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    credentials: 'same-origin',
  });
  return handleResponse(res, 'Failed to fetch child');
}

export async function apiGetChildren(fields = []) {
  const params = new URLSearchParams();
  if (Array.isArray(fields) && fields.length) {
    params.set('fields', fields.join(','));
  }
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/api/children${queryString}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    credentials: 'same-origin',
  });
  return handleResponse(res, 'Failed to fetch children');
}

export async function apiGetChildrenByMother(motherId) {
  const res = await fetch(`${API_BASE}/api/children/mother/${encodeURIComponent(motherId)}/children`, {
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    credentials: 'same-origin',
  });
  return handleResponse(res, 'Failed to fetch children for mother');
}

export async function apiSaveChildCheckup(childId, payload) {
  const res = await fetch(`${API_BASE}/api/children/${encodeURIComponent(childId)}/checkups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
  });
  return handleResponse(res, 'Server error when saving child check-up');
}

export async function apiUploadChildBirthDocument(childId, file) {
  const formData = new FormData();
  formData.append('birthDocument', file);
  const res = await fetch(`${API_BASE}/api/children/${encodeURIComponent(childId)}/documents`, {
    method: 'POST',
    headers: { ...authHeader() },
    body: formData,
    credentials: 'same-origin',
  });
  return handleResponse(res, 'Unable to upload child birth document');
}
