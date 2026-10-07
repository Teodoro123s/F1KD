export const THEME_STORAGE_KEY = 'settings.darkMode';

export function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'true' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme) {
  const selectedTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = selectedTheme;
  document.documentElement.style.colorScheme = selectedTheme;
  document.body.dataset.theme = selectedTheme;
}
