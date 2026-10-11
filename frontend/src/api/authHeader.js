const configuredApiBase = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL)
  ? process.env.REACT_APP_API_URL
  : (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : '';
const API_BASE = configuredApiBase || (import.meta.env?.DEV
  ? 'http://localhost:4000'
  : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000'));

export function authHeader() {
  try {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (error) {
    return {};
  }
}

export function getApiBaseUrl() {
  return API_BASE;
}

export function resolveAssetUrl(pathname) {
  if (!pathname) return '';
  if (/^https?:\/\//i.test(pathname)) return pathname;

  const normalizedPath = encodeURI(String(pathname).trim());
  if (!normalizedPath) return '';

  if (normalizedPath.startsWith('/')) return `${API_BASE}${normalizedPath}`;
  return `${API_BASE}/${normalizedPath}`;
}

export async function fetchWithAuth(url, options = {}) {
  const { timeoutMs = 30000, signal, ...fetchOptions } = options;
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(signal.reason);
  if (signal?.aborted) {
    abortFromCaller();
  } else {
    signal?.addEventListener('abort', abortFromCaller, { once: true });
  }
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const requestOptions = {
    credentials: 'include',
    ...fetchOptions,
    signal: controller.signal,
    headers: {
      ...authHeader(),
      ...(fetchOptions.headers || {}),
    },
  };

  try {
    const response = await fetch(url, requestOptions);
    if (response.status === 401) {
      window.dispatchEvent(new Event('f1kd:session-expired'));
    }
    const method = String(requestOptions.method || 'GET').toUpperCase();
    if (
      response.ok
      && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
      && !String(url).includes('/api/notifications/mark-read')
    ) {
      window.dispatchEvent(new Event('f1kd:notifications-changed'));
    }
    return response;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timedOut) {
      throw new Error('The request timed out. Your entered information is still available. Check your connection and try again.');
    }
    if (error instanceof TypeError) {
      throw new Error('Unable to reach the server. Check your internet connection. Your entered information is still available; try again when connected.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}
