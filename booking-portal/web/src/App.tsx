import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './components/auth/LoginPage';
import { UnauthorizedPage } from './components/auth/Unauthorized';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Bookings from './pages/Bookings';
import Validation from './pages/Validation';
import Admin from './pages/Admin';
import Header from './components/Header';

// Mantine imports
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';

// Mantine theme configuration
const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
});

function App() {
  return (
    <MantineProvider theme={theme}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="app-container">
                    <div className="main-content">
                      <Header />
                      <div className="content-area">
                        <Routes>
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/upload" element={<Upload />} />
                          <Route path="/bookings" element={<Bookings />} />
                          <Route path="/validate/:bookingId" element={<Validation />} />
                          <Route path="/admin" element={<Admin />} />
                        </Routes>
                      </div>
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;
