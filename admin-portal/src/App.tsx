import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { UserRole } from './auth/authConfig';
import ErrorBoundary from './components/ErrorBoundary';
import { NotificationProvider } from './contexts/NotificationContext';

// Mantine imports
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';

// Auth pages
import { LoginPage } from './components/auth/LoginPage';
import { MFARequiredPage } from './components/auth/MFARequired';
import { UnauthorizedPage } from './components/auth/Unauthorized';

// Admin Portal
import AdminPortal from './components/AdminPortal';
import NotFound from './components/NotFound';

import './App.css';
import './components/help/help.css';
import './styles/responsive.css';

// Mantine theme configuration
const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
});

function App() {
  return (
    <MantineProvider theme={theme}>
      <Notifications position="top-right" zIndex={2077} />
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
    </MantineProvider>
  );
}

export default App;
