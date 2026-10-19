import { fetchWithAuth } from './authHeader';
import { readApiResponse } from './readApiResponse.mjs';

async function requestNotifications(url, options = {}) {
  const response = await fetchWithAuth(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  return readApiResponse(response, 'Unable to complete notification request');
}

export function apiGetNotifications({ page = 1, perPage = 10, search = '', category = '', readStatus = 'all' } = {}) {
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage), search });
  if (category && category !== 'All') {
    params.set('category', category);
  }
  if (readStatus !== 'all') {
    params.set('readStatus', readStatus);
  }
  return requestNotifications(`/api/notifications?${params.toString()}`);
}

export function apiMarkNotificationRead(id) {
  return requestNotifications(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: 'POST',
  }).then((response) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('notifications:read-state-changed'));
    }
    return response;
  });
}

export function apiRecordReportDownload() {
  return requestNotifications('/api/notifications/download-success', {
    method: 'POST',
    body: JSON.stringify({ format: 'CSV' }),
  });
}