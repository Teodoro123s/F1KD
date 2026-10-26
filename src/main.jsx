import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './auth/AuthProvider';
import { LoadingScreen } from './components/LoadingSkeleton';
import DemoApp from './demo/DemoApp';

const PRELOAD_RELOAD_KEY = 'f1kd:preload-error-reload-at';
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const lastReload = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY)) || 0;
  if (Date.now() - lastReload < 30000) return;
  sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now()));
  window.location.reload();
});

const root = createRoot(document.getElementById('root'));
const isDemoBuild = import.meta.env.VITE_DEMO_MODE === 'true';
const Router = isDemoBuild ? HashRouter : BrowserRouter;
const app = (
  <Suspense fallback={<LoadingScreen message="Loading page..." />}>
    {isDemoBuild ? <DemoApp /> : <AuthProvider><App /></AuthProvider>}
  </Suspense>
);

root.render(
  <StrictMode>
    <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      {app}
    </Router>
  </StrictMode>
);
