const API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL)
  ? process.env.REACT_APP_API_URL
  : (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:4000';

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
  if (pathname.startsWith('/')) return `${API_BASE}${pathname}`;
  return `${API_BASE}/${pathname}`;
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
    const refreshResponse = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (refreshResponse.ok) {
      const refreshData = await refreshResponse.json();
      const nextToken = refreshData && refreshData.token;
      if (nextToken) {
        localStorage.setItem('auth_token', nextToken);
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
    }
  } catch (error) {
    console.warn('Auth refresh failed', error);
  }

  return response;
}
