// Member Portal Entry Point - Testing auto-trigger (2025-10-30)
import { PublicClientApplication } from '@azure/msal-browser';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { msalConfig } from './auth/authConfig';
import './i18n'; // Initialize i18n
import App from './App';
import './index.css';

export const msalInstance = new PublicClientApplication(msalConfig);

msalInstance
  .initialize()
  .then(() => {
    // Handle redirect promise (critical for redirect authentication)
    return msalInstance.handleRedirectPromise();
  })
  .then(() => {
    const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

    root.render(
      <React.StrictMode>
        <App instance={msalInstance} />
      </React.StrictMode>
    );
  })
  .catch((err) => {
    console.error('MSAL initialization or redirect handling failed:', err);
  });
