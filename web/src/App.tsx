import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './kendoLicense';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { UserRole } from './auth/authConfig';
import { NotificationProvider } from './contexts/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';

// Auth pages
import { LoginPage } from './components/auth/LoginPage';
import { MFARequiredPage } from './components/auth/MFARequired';
import { UnauthorizedPage } from './components/auth/Unauthorized';

// Admin Portal
import AdminPortal from './components/AdminPortal';

// Import Kendo UI theme
import '@progress/kendo-theme-default/dist/all.css';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/mfa-required" element={<MFARequiredPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Admin Portal - requires Association Admin or System Admin role */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute requireAdminPortalAccess>
                    <AdminPortal />
                  </ProtectedRoute>
                }
              />

              {/* Default redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
