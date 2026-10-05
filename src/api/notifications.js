import { fetchWithAuth } from './authHeader';

async function requestNotifications(url, options = {}) {
  const response = await fetchWithAuth(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || `Unable to load notifications (${response.status})`);
  }
  return body;
}

export function apiGetNotifications({ page = 1, perPage = 10, search = '', category = '' } = {}) {
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage), search });
  if (category && category !== 'All') {
    params.set('category', category);
  }
  return requestNotifications(`/api/notifications?${params.toString()}`);
}

export function apiRecordReportDownload() {
  return requestNotifications('/api/notifications/download-success', {
    method: 'POST',
    body: JSON.stringify({ format: 'CSV' }),
  });
}