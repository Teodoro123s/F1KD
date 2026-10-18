import { fetchWithAuth, getApiBaseUrl } from './authHeader';

const API_BASE = getApiBaseUrl();

async function requestJson(url, options = {}) {
  const response = await fetchWithAuth(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      throw new Error('The server returned an invalid response.');
    }
  }
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}

export const apiGetProgressReportOptions = () => requestJson(`${API_BASE}/api/progress-report/options`);
export const apiGetProgressReportAiStatus = () => requestJson(`${API_BASE}/api/progress-report/ai/status`);
export const apiCreateProgressReportAiProposal = (prompt) => requestJson(`${API_BASE}/api/progress-report/ai/proposal`, {
  method: 'POST',
  body: JSON.stringify({ prompt }),
});
export const apiCreateMonitoringReportIntent = (prompt, beneficiaryType) => requestJson(`${API_BASE}/api/progress-report/ai/monitoring-report`, {
  method: 'POST',
  body: JSON.stringify({ prompt, beneficiaryType }),
});
export const apiCreateBeneficiaryAssistantIntent = (prompt) => requestJson(`${API_BASE}/api/progress-report/ai/beneficiary-assistant`, {
  method: 'POST',
  body: JSON.stringify({ prompt }),
});
export const apiCreateAdminAssistantIntent = (audience, prompt) => requestJson(`${API_BASE}/api/progress-report/ai/admin-assistant`, {
  method: 'POST',
  body: JSON.stringify({ audience, prompt }),
});
export const apiCreateProgressReportAiEntryAssist = (fieldId, draft) => requestJson(`${API_BASE}/api/progress-report/ai/entry-assist`, {
  method: 'POST',
  body: JSON.stringify({ fieldId, draft }),
});
export const apiCreateProgressReportAiSummary = (payload) => requestJson(`${API_BASE}/api/progress-report/ai/summary`, {
  method: 'POST',
  body: JSON.stringify(payload),
});
export const apiCreateDashboardInsight = (metrics, question = '') => requestJson(`${API_BASE}/api/progress-report/ai/dashboard-insight`, {
  method: 'POST',
  body: JSON.stringify({ metrics, question }),
});
export const apiGetProgressReport = (params) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined));
  return requestJson(`${API_BASE}/api/progress-report?${query.toString()}`);
};