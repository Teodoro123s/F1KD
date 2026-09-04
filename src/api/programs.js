import { authHeader } from './authHeader';

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...(options.headers || {}) },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error || body?.message || `Request failed (${response.status})`);
  return body;
}

export const apiGetPrograms = () => requestJson('/api/programs');
export const apiCreateProgram = (payload) => requestJson('/api/programs', { method: 'POST', body: JSON.stringify(payload) });
export const apiUpdateProgram = (id, payload) => requestJson(`/api/programs/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) });
export const apiEndProgram = (id) => requestJson(`/api/programs/${encodeURIComponent(id)}/end`, { method: 'PATCH' });
export const apiDeleteProgram = (id) => requestJson(`/api/programs/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const apiCreateProgramClusters = (id, scopes) => requestJson(`/api/programs/${encodeURIComponent(id)}/clusters`, { method: 'POST', body: JSON.stringify({ scopes }) });
export const apiCompleteProgramCluster = (programId, clusterId) => requestJson(`/api/programs/${encodeURIComponent(programId)}/clusters/${encodeURIComponent(clusterId)}/complete`, { method: 'PATCH' });
