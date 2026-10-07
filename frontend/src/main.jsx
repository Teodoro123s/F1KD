import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './auth/AuthProvider';
import { LoadingScreen } from './components/LoadingSkeleton';

const root = createRoot(document.getElementById('root'));

root.render(
  <StrictMode>
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Suspense fallback={<LoadingScreen message="Loading the system..." />}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Suspense>
    </BrowserRouter>
  </StrictMode>
);
