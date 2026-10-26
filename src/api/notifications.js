import { fetchWithAuth } from './authHeader';
import { readApiResponse } from './readApiResponse.mjs';

async function requestNotifications(url, options = {}) {
  const response = await fetchWithAuth(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  return readApiResponse(response, 'Unable to complete notification request');
}

function notifyReadStateChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('notifications:read-state-changed'));
  }
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

export function apiGetNotificationPreferences() {
  return requestNotifications('/api/notifications/preferences');
}

export function apiSaveNotificationPreferences(preferences) {
  return requestNotifications('/api/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify({ preferences }),
  }).then((response) => {
    notifyReadStateChanged();
    return response;
  });
}

export function apiMarkNotificationRead(id) {
  return requestNotifications(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: 'POST',
  }).then((response) => {
    notifyReadStateChanged();
    return response;
  });
}

export function apiSetNotificationRead(id, isRead) {
  return requestNotifications(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
    body: JSON.stringify({ isRead }),
  }).then((response) => {
    notifyReadStateChanged();
    return response;
  });
}

export function apiMarkAllNotificationsRead() {
  return requestNotifications('/api/notifications/read-all', {
    method: 'POST',
  }).then((response) => {
    notifyReadStateChanged();
    return response;
  });
}

export function apiBulkSetNotificationsRead(ids, isRead) {
  return requestNotifications('/api/notifications/bulk-read', {
    method: 'POST',
    body: JSON.stringify({ ids, isRead }),
  }).then((response) => {
    notifyReadStateChanged();
    return response;
  });
}

export function apiRecordReportDownload(fileName) {
  return requestNotifications('/api/notifications/download-success', {
    method: 'POST',
    body: JSON.stringify({ format: 'CSV', fileName }),
  });
}