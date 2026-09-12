export function authHeader() {
  try {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (error) {
    return {};
  }
}
