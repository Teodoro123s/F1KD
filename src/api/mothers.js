const API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL)
  ? process.env.REACT_APP_API_URL
  : (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:4000';

async function handleResponse(res, defaultMsg) {
  const contentType = res.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('application/json')) {
    try { body = await res.json(); } catch (e) { body = null; }
  } else {
    try { body = await res.text(); } catch (e) { body = null; }
  }
  if (res.ok) return body;
  const msg = (body && (body.error || body.message)) ? (body.error || body.message) : res.statusText || defaultMsg;
  const err = new Error(msg);
  err.status = res.status;
  err.body = body;
  throw err;
}

export async function apiUpdateMother(motherId, payload) {
  const id = encodeURIComponent(motherId);
  const res = await fetch(`${API_BASE}/api/mothers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
  });
  return handleResponse(res, 'Server error when updating mother');
}

export async function apiGetMother(motherId) {
  const id = encodeURIComponent(motherId);
  const res = await fetch(`${API_BASE}/api/mothers/${id}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  });
  return handleResponse(res, 'Failed to fetch mother');
}
