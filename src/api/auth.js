// Simple auth client using JWT in Authorization header
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

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res, 'Login failed');
}

export async function me(token) {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: token ? `Bearer ${token}` : '' },
  });
  return handleResponse(res, 'Failed to fetch current user');
}

export function saveToken(token) {
  try { localStorage.setItem('auth_token', token); } catch (e) {}
}
export function loadToken() {
  try { return localStorage.getItem('auth_token'); } catch (e) { return null; }
}
export function clearToken() {
  try { localStorage.removeItem('auth_token'); } catch (e) {}
}
