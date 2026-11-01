import { fetchWithAuth, getApiBaseUrl } from './authHeader';
import { readApiResponse } from './readApiResponse.mjs';

const API_BASE = getApiBaseUrl();

async function requestJson(url, options = {}) {
  const response = await fetchWithAuth(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  return readApiResponse(response, 'Unable to complete archive request');
}

export function apiGetArchivedRecords(type, { search = '', page = 1, limit = 25 } = {}) {
  const params = new URLSearchParams({ type, search, page: String(page), limit: String(limit) });
  return requestJson(`${API_BASE}/api/archives?${params}`);
}

export function apiGetArchiveActivity({ page = 1, limit = 25 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return requestJson(`${API_BASE}/api/archives/activity?${params}`);
}

export function apiGetArchiveImpact(type, id) {
  return requestJson(`${API_BASE}/api/archives/${encodeURIComponent(type)}/${encodeURIComponent(id)}/impact`);
}

export function apiArchiveRecord(type, id, reason = '') {
  return requestJson(`${API_BASE}/api/archives/${encodeURIComponent(type)}/${encodeURIComponent(id)}/archive`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function apiRestoreArchivedRecord(type, id) {
  return requestJson(`${API_BASE}/api/archives/${encodeURIComponent(type)}/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
