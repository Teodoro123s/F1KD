export const AUTH_KEY = 'devAuth';

export function isAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

export function signIn() {
  localStorage.setItem(AUTH_KEY, 'true');
}

export function signOut() {
  localStorage.removeItem(AUTH_KEY);
}
