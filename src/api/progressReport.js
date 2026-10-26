import { fetchWithAuth, getApiBaseUrl } from './authHeader';
import { readApiResponse } from './readApiResponse.mjs';

const API_BASE = getApiBaseUrl();

async function requestJson(url, options = {}) {
  const response = await fetchWithAuth(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return readApiResponse(response, 'Unable to complete progress report request');
}

export const apiGetProgressReportOptions = () => requestJson(`${API_BASE}/api/progress-report/options`);
export const apiGetProgressReportAiStatus = () => requestJson(`${API_BASE}/api/progress-report/ai/status`);
export const apiCreateProgressReportAiProposal = (prompt) => requestJson(`${API_BASE}/api/progress-report/ai/proposal`, {
  method: 'POST',
  body: JSON.stringify({ prompt }),
});
export const apiCreateMonitoringReportIntent = (prompt) => requestJson(`${API_BASE}/api/progress-report/ai/monitoring-report`, {
  method: 'POST',
  body: JSON.stringify({ prompt }),
});
export const apiCreateDashboardInsight = (metrics, question = '') => requestJson(`${API_BASE}/api/progress-report/ai/dashboard-insight`, {
  method: 'POST',
  body: JSON.stringify({ metrics, question }),
});
export const apiGetProgressReport = (params) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined));
  return requestJson(`${API_BASE}/api/progress-report?${query.toString()}`);
};
