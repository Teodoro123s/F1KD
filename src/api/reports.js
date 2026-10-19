import { fetchWithAuth, getApiBaseUrl } from './authHeader';
import { readApiResponse } from './readApiResponse.mjs';

const API_BASE = getApiBaseUrl();

export async function apiGetReportScopes() {
  const response = await fetchWithAuth(`${API_BASE}/api/reports/scopes`, {
    headers: { 'Content-Type': 'application/json' },
  });
  return readApiResponse(response, 'Unable to load report scopes');
}

export async function apiGetActivityUsers() {
  const response = await fetchWithAuth(`${API_BASE}/api/reports/users`, {
    headers: { 'Content-Type': 'application/json' },
  });
  return readApiResponse(response, 'Unable to load users');
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
  return readApiResponse(response, 'Unable to load reports');
}
