import { fetchWithAuth, getApiBaseUrl } from './authHeader';
import { readApiResponse } from './readApiResponse.mjs';

const API_BASE = getApiBaseUrl();

async function requestGuidance(path, options = {}) {
  const response = await fetchWithAuth(`${API_BASE}/api/help-guidance${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  return readApiResponse(response, 'Unable to update help and guidance preferences');
}

export const apiGetGuidancePreferences = () => requestGuidance('/preferences');
export const apiSaveGuidancePreferences = (preferences) => requestGuidance('/preferences', {
  method: 'PUT',
  body: JSON.stringify({ preferences }),
});
export const apiResetGuidancePreferences = () => requestGuidance('/preferences/reset', {
  method: 'POST',
  body: JSON.stringify({}),
});
