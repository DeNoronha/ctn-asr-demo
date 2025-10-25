import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './kendoLicense';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { UserRole } from './auth/authConfig';
import ErrorBoundary from './components/ErrorBoundary';
import { NotificationProvider } from './contexts/NotificationContext';

// Auth pages
import { LoginPage } from './components/auth/LoginPage';
import { MFARequiredPage } from './components/auth/MFARequired';
import { UnauthorizedPage } from './components/auth/Unauthorized';

// Admin Portal
import AdminPortal from './components/AdminPortal';
import NotFound from './components/NotFound';

// Import Kendo UI theme
import '@progress/kendo-theme-default/dist/all.css';
import './App.css';
import './components/help/help.css';

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

              {/* 404 Not Found - Only for truly non-existent routes outside admin portal */}
              <Route path="/404" element={<NotFound />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
