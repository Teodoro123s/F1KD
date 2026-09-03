import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './styles/components/dashboard.css';
import { AuthProvider } from './auth/AuthProvider';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <React.Suspense fallback={null}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </React.Suspense>
      </BrowserRouter>
  </React.StrictMode>
);
