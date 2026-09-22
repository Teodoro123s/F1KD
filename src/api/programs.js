import { fetchWithAuth, getApiBaseUrl } from './authHeader';

const API_BASE = getApiBaseUrl();

async function requestJson(url, options = {}) {
  const response = await fetchWithAuth(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) throw new Error(body?.error || body?.message || `Request failed (${response.status})`);
  return body;
}

export const apiGetPrograms = () => requestJson(`${API_BASE}/api/programs`);
export const apiCreateProgram = (payload) => requestJson(`${API_BASE}/api/programs`, { method: 'POST', body: JSON.stringify(payload) });
export const apiUpdateProgram = (id, payload) => requestJson(`${API_BASE}/api/programs/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) });
export const apiEndProgram = (id) => requestJson(`${API_BASE}/api/programs/${encodeURIComponent(id)}/end`, { method: 'PATCH' });
export const apiRestoreProgram = (id) => requestJson(`${API_BASE}/api/programs/${encodeURIComponent(id)}/restore`, { method: 'PATCH' });
export const apiDeleteProgram = (id) => requestJson(`${API_BASE}/api/programs/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const apiCreateProgramClusters = (id, scopes) => requestJson(`${API_BASE}/api/programs/${encodeURIComponent(id)}/clusters`, { method: 'POST', body: JSON.stringify({ scopes }) });
export const apiCompleteProgramCluster = (programId, clusterId) => requestJson(`${API_BASE}/api/programs/${encodeURIComponent(programId)}/clusters/${encodeURIComponent(clusterId)}/complete`, { method: 'PATCH' });
export const apiCompleteNamedProgramCluster = (programId, cluster) => requestJson(`${API_BASE}/api/programs/${encodeURIComponent(programId)}/clusters/complete`, { method: 'PATCH', body: JSON.stringify({ type: cluster.type, name: cluster.name, beneficiaries: cluster.beneficiaries }) });
export const apiGetProgramMonitoring = (programId, date) => requestJson(`${API_BASE}/api/programs/${encodeURIComponent(programId)}/monitoring?date=${encodeURIComponent(date)}`);
export const apiSetProgramMonitoring = (programId, payload) => requestJson(`${API_BASE}/api/programs/${encodeURIComponent(programId)}/monitoring`, { method: 'PATCH', body: JSON.stringify(payload) });
export const apiGetBeneficiaryMonitoringReport = (programId, beneficiaryType, beneficiaryId) => requestJson(`${API_BASE}/api/programs/${encodeURIComponent(programId)}/monitoring/report/${encodeURIComponent(beneficiaryType)}/${encodeURIComponent(beneficiaryId)}`);
export const apiGetClusterMonitoringReport = (programId, clusterType, clusterName) => requestJson(`${API_BASE}/api/programs/${encodeURIComponent(programId)}/monitoring/cluster-report/${encodeURIComponent(clusterType)}/${encodeURIComponent(clusterName)}`);
export const apiSetBeneficiaryMonitoring = (programId, payload) => apiSetProgramMonitoring(programId, payload);
