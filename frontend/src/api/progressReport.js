import { fetchWithAuth, getApiBaseUrl } from './authHeader';

const API_BASE = getApiBaseUrl();

async function requestJson(url) {
  const response = await fetchWithAuth(url, { headers: { 'Content-Type': 'application/json' } });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}

export const apiGetProgressReportOptions = () => requestJson(`${API_BASE}/api/progress-report/options`);
export const apiGetProgressReport = (params) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined));
  return requestJson(`${API_BASE}/api/progress-report?${query.toString()}`);
};