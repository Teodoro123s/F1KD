// Simple auth client using JWT in Authorization header
import { fetchWithAuth, getApiBaseUrl, refreshSessionRequest } from './authHeader';
import { readApiResponse } from './readApiResponse.mjs';
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStore';

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

export async function changePassword(currentPassword, newPassword, confirmPassword) {
  const res = await fetchWithAuth(`${API_BASE}/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
  return readApiResponse(res, 'Unable to change your password');
}

export async function refreshSession() {
  const result = await refreshSessionRequest();
  if (!result?.token) throw new Error('Unable to refresh your session');
  return result;
}

export async function logoutSession() {
  const res = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  return readApiResponse(res, 'Unable to end your server session');
}

export async function me(token) {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: token ? `Bearer ${token}` : '' },
    credentials: 'include',
  });
  return readApiResponse(res, 'Unable to load your account');
}

export function saveToken(token) {
  setAccessToken(token);
}
export function loadToken() {
  return getAccessToken();
}
export function clearToken() {
  clearAccessToken();
}
