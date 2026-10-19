// Simple auth client using JWT in Authorization header
import { fetchWithAuth, getApiBaseUrl } from './authHeader';
import { readApiResponse } from './readApiResponse.mjs';

const API_BASE = getApiBaseUrl();

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  return readApiResponse(res, 'Unable to sign in');
}

export async function requestPasswordReset(email) {
  const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return readApiResponse(res, 'Unable to request a password reset');
}

export async function resetPassword(email, passcode, newPassword, confirmPassword) {
  const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, passcode, newPassword, confirmPassword }),
  });
  return readApiResponse(res, 'Unable to reset your password');
}

export async function loginAsTestRole(role) {
  const res = await fetch(`${API_BASE}/api/auth/test-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
    credentials: 'include',
  });
  return readApiResponse(res, 'Unable to sign in to the selected test role');
}

export async function changePassword(currentPassword, newPassword, confirmPassword) {
  const res = await fetchWithAuth(`${API_BASE}/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
  return readApiResponse(res, 'Unable to change your password');
}

export async function refreshSession() {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  const result = await readApiResponse(res, 'Unable to refresh your session');
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
  return readApiResponse(res, 'Unable to load your account');
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
