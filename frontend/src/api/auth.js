// Simple auth client using JWT in Authorization header
import { fetchWithAuth, getApiBaseUrl } from './authHeader';

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

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  return handleResponse(res, 'Login failed');
}

export async function acceptConsent() {
  const res = await fetchWithAuth(`${API_BASE}/api/auth/consent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accepted: true }),
  });
  return handleResponse(res, 'Unable to record consent');
}

export async function changePassword(currentPassword, newPassword, confirmPassword) {
  const res = await fetchWithAuth(`${API_BASE}/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
  return handleResponse(res, 'Password change failed');
}

export async function requestPasswordResetCode() {
  const res = await fetchWithAuth(`${API_BASE}/api/auth/password-reset/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return handleResponse(res, 'Unable to send verification code');
}

export async function confirmPasswordReset(passcode, newPassword, confirmPassword) {
  const res = await fetchWithAuth(`${API_BASE}/api/auth/password-reset/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode, newPassword, confirmPassword }),
  });
  return handleResponse(res, 'Unable to reset password');
}

export async function refreshSession() {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  const result = await handleResponse(res, 'Session refresh failed');
  if (result && result.token) {
    saveToken(result.token);
  }
  return result;
}

export async function me(token) {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: token ? `Bearer ${token}` : '' },
    credentials: 'include',
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
