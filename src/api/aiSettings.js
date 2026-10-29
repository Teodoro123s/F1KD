import { fetchWithAuth, getApiBaseUrl } from './authHeader';
import { readApiResponse } from './readApiResponse.mjs';

const API_BASE = getApiBaseUrl();

async function requestJson(path, options = {}) {
  const response = await fetchWithAuth(`${API_BASE}/api/ai-settings${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  return readApiResponse(response, 'Unable to complete AI settings request');
}

export const apiGetAiConfiguration = () => requestJson('/configuration');
export const apiTestAiConfiguration = (configuration) => requestJson('/test', {
  method: 'POST',
  body: JSON.stringify(configuration),
});
export const apiSaveAiConfiguration = (configuration) => requestJson('/configuration', {
  method: 'PUT',
  body: JSON.stringify(configuration),
});
export const apiRemoveAiConfiguration = () => requestJson('/configuration', { method: 'DELETE' });
export const apiCreateAiReportProposal = (prompt) => requestJson('/proposal', {
  method: 'POST',
  body: JSON.stringify({ prompt }),
});
