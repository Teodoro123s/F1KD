import { fetchWithAuth, getApiBaseUrl } from './authHeader';

const API_BASE = getApiBaseUrl();

export async function apiGetReportScopes() {
  const response = await fetchWithAuth(`${API_BASE}/api/reports/scopes`, {
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || `Unable to load report scopes (${response.status})`);
  }
  return body;
}

export async function apiGetActivityUsers() {
  const response = await fetchWithAuth(`${API_BASE}/api/reports/users`, {
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || `Unable to load users (${response.status})`);
  }
  return body;
}

export async function apiGetActivityReport({
  page = 1,
  perPage = 20,
  action = '',
  actorUserId = '',
  schoolId = '',
  groupId = '',
  search = '',
  from = '',
  to = '',
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
    search,
  });
  if (action) params.set('action', action);
  if (actorUserId) params.set('actorUserId', String(actorUserId));
  if (schoolId) params.set('schoolId', String(schoolId));
  if (groupId) params.set('groupId', String(groupId));
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const response = await fetchWithAuth(`${API_BASE}/api/reports/activity?${params.toString()}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || `Unable to load reports (${response.status})`);
  }
  return body;
}
