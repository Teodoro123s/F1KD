// Small API client for community module
// Exports: getSummary, createCommunity, createBatch, createGroup

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
  if (!res.ok) {
    const err = new Error((body && body.error) || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function getSummary() {
  return requestJson('/api/community/summary');
}

export async function createCommunity(payload) {
  return requestJson('/api/community/communities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function createBatch(payload) {
  return requestJson('/api/community/batches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function createGroup(payload) {
  return requestJson('/api/community/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
