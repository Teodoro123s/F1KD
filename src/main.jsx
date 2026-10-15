import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './auth/AuthProvider';
import { LoadingScreen } from './components/LoadingSkeleton';

const PRELOAD_RELOAD_KEY = 'f1kd:preload-error-reload-at';
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const lastReload = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY)) || 0;
  if (Date.now() - lastReload < 30000) return;
  sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now()));
  window.location.reload();
});

const root = createRoot(document.getElementById('root'));

root.render(
  <StrictMode>
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Suspense fallback={<LoadingScreen message="Loading page..." />}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Suspense>
    </BrowserRouter>
  </StrictMode>
);
