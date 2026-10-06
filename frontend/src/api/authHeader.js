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
  const requestOptions = {
    credentials: 'include',
    ...options,
    headers: {
      ...authHeader(),
      ...(options.headers || {}),
    },
  };

  const response = await fetch(url, requestOptions);
  if (response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('f1kd:session-expired'));
  }
  return response;
}
