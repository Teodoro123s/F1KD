import { getAccessToken, setAccessToken } from './tokenStore';

let refreshRequest = null;

const configuredApiBase = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL)
  ? process.env.REACT_APP_API_URL
  : (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : '';
const API_BASE = configuredApiBase || (import.meta.env?.DEV
  ? ''
  : (typeof window !== 'undefined' ? window.location.origin : ''));

export function authHeader() {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getApiBaseUrl() {
  return API_BASE;
}

export function refreshSessionRequest() {
  if (!refreshRequest) {
    refreshRequest = fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }).then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json();
      if (data?.token) setAccessToken(data.token);
      return data;
    }).finally(() => {
      refreshRequest = null;
    });
  }
  return refreshRequest;
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

  let response = await fetch(url, requestOptions);
  if (response.status !== 401 || requestOptions.__retry) return response;

  try {
    const refreshData = await refreshSessionRequest();
    const nextToken = refreshData?.token;
    if (nextToken) {
      const retryOptions = {
        ...requestOptions,
        __retry: true,
        headers: {
          ...authHeader(),
          ...(options.headers || {}),
        },
      };
      response = await fetch(url, retryOptions);
    }
  } catch (error) {
    console.warn('Auth refresh failed', error);
  }

  return response;
}
