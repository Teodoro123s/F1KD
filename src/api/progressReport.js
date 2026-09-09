import { authHeader } from './authHeader';

async function requestJson(url) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json', ...authHeader() } });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}

export const apiGetProgressReportOptions = () => requestJson('/api/progress-report/options');
export const apiGetProgressReport = (params) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined));
  return requestJson(`/api/progress-report?${query.toString()}`);
};