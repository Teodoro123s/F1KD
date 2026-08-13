// API helpers for user management
const API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL)
  ? process.env.REACT_APP_API_URL
  : (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:4000';

export async function apiGetUsers(page = 1, perPage = 100) {
  const url = `${API_BASE}/api/users?page=${page}&perPage=${perPage}`;
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || res.statusText || 'Failed to fetch users');
  }
  return res.json();
}

export async function apiCreateUser(payload) {
  const res = await fetch(`${API_BASE}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || res.statusText || 'Server error when creating user');
  }
  return res.json();
}

export async function apiUpdateUser(id, payload) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || res.statusText || 'Server error when updating user');
  }
  return res.json();
}

export async function apiPatchUserStatus(id, status) {
  const res = await fetch(`${API_BASE}/api/users/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || res.statusText || 'Failed to update user status');
  }
  return res.json();
}

export async function apiDeleteUser(id) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, { method: 'DELETE', credentials: 'same-origin' });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || res.statusText || 'Failed to delete user');
  }
  return res.json();
}
