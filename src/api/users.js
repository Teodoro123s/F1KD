// API helpers for user management (improved error handling and consistent responses)
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

export async function apiGetUsers(page = 1, perPage = 100) {
  const url = `${API_BASE}/api/users?page=${page}&perPage=${perPage}`;
  const res = await fetch(url, { credentials: 'same-origin' });
  return handleResponse(res, 'Failed to fetch users');
}

export async function apiCreateUser(payload) {
  const res = await fetch(`${API_BASE}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
  });
  return handleResponse(res, 'Server error when creating user');
}

export async function apiUpdateUser(id, payload) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
  });
  return handleResponse(res, 'Server error when updating user');
}

export async function apiPatchUserStatus(id, status) {
  const res = await fetch(`${API_BASE}/api/users/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
    credentials: 'same-origin',
  });
  return handleResponse(res, 'Failed to update user status');
}

export async function apiDeleteUser(id) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, { method: 'DELETE', credentials: 'same-origin' });
  return handleResponse(res, 'Failed to delete user');
}
