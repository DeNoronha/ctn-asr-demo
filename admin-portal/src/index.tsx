import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/security-utilities.css'; // SEC-005: Utility classes to reduce inline styles
import './styles/accessibility.css'; // DA-001: WCAG 2.1 AA compliant colors and styles
import 'mantine-datatable/styles.css'; // Mantine DataTable styles
import './i18n'; // Initialize i18n
import App from './App';
import { msalInstance } from './auth/AuthContext';
import { logger } from './utils/logger';
import reportWebVitals from './reportWebVitals';

// Expose msalInstance globally for debugging (development only)
if (
  process.env.NODE_ENV === 'development' ||
  window.location.hostname.includes('azurestaticapps.net')
) {
  (window as any).msalInstance = msalInstance;
  logger.log('🔧 Debug mode: msalInstance exposed on window object');
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(logger.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
