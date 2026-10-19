// API helpers for user management (improved error handling and consistent responses)
import { fetchWithAuth, getApiBaseUrl } from './authHeader';
import { readApiResponse } from './readApiResponse.mjs';

const API_BASE = getApiBaseUrl();

export async function apiGetUsers(page = 1, perPage = 100) {
  const url = `${API_BASE}/api/users?page=${page}&perPage=${perPage}`;
  const res = await fetchWithAuth(url, { headers: { 'Content-Type': 'application/json' } });
  return readApiResponse(res, 'Unable to load users');
}

export async function apiGetManagedHealthWorkers() {
  const res = await fetchWithAuth(`${API_BASE}/api/users/health-workers`, {
    headers: { 'Content-Type': 'application/json' },
  });
  return readApiResponse(res, 'Unable to load assigned health workers');
}

export async function apiGetManagedHealthWorker(id) {
  const res = await fetchWithAuth(`${API_BASE}/api/users/health-workers/${encodeURIComponent(id)}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  return readApiResponse(res, 'Unable to load the assigned health worker');
}

export async function apiCreateManagedHealthWorker(payload) {
  const res = await fetchWithAuth(`${API_BASE}/api/users/health-workers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readApiResponse(res, 'Unable to create health worker');
}

export async function apiUpdateManagedHealthWorker(id, payload) {
  const res = await fetchWithAuth(`${API_BASE}/api/users/health-workers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readApiResponse(res, 'Unable to update health worker');
}

export async function apiPatchManagedHealthWorkerStatus(id, status) {
  const res = await fetchWithAuth(`${API_BASE}/api/users/health-workers/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return readApiResponse(res, 'Unable to update health worker status');
}

export async function apiGetCoordinators() {
  const res = await fetchWithAuth(`${API_BASE}/api/users/coordinators`, {
    headers: { 'Content-Type': 'application/json' },
  });
  return readApiResponse(res, 'Unable to load coordinators');
}

export async function apiCreateUser(payload) {
  const res = await fetchWithAuth(`${API_BASE}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readApiResponse(res, 'Unable to create user');
}

export async function apiUpdateUser(id, payload) {
  const res = await fetchWithAuth(`${API_BASE}/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readApiResponse(res, 'Unable to update user');
}

export async function apiPatchUserStatus(id, status) {
  const res = await fetchWithAuth(`${API_BASE}/api/users/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return readApiResponse(res, 'Unable to update user status');
}
 
export async function apiDeleteUser(id) {
  const res = await fetchWithAuth(`${API_BASE}/api/users/${id}`, { method: 'DELETE' });
  return readApiResponse(res, 'Unable to delete user');
}

export async function apiGetUser(id) {
 const res = await fetchWithAuth(`${API_BASE}/api/users/${id}`, {
   headers: { 'Content-Type': 'application/json' },
 });
 return readApiResponse(res, 'Unable to load user');
}
