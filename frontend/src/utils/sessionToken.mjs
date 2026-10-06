export function decodeTokenPayload(token) {
  try {
    const payloadPart = String(token || '').split('.')[1];
    if (!payloadPart) return null;

    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function getTokenExpiration(token) {
  const payload = decodeTokenPayload(token);
  const expiration = Number(payload?.exp);
  return Number.isFinite(expiration) && expiration > 0 ? expiration * 1000 : null;
}

export function isTokenExpired(token, now = Date.now()) {
  const expiration = getTokenExpiration(token);
  return expiration === null || expiration <= now;
}
