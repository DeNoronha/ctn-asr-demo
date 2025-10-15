import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n'; // Initialize i18n
import App from './App';
import { msalInstance } from './auth/AuthContext';
import reportWebVitals from './reportWebVitals';

// Expose msalInstance globally for debugging (development only)
if (
  process.env.NODE_ENV === 'development' ||
  window.location.hostname.includes('azurestaticapps.net')
) {
  (window as any).msalInstance = msalInstance;
  console.log('🔧 Debug mode: msalInstance exposed on window object');
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
