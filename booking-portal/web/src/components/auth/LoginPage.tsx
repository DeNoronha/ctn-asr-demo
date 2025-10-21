/**
 * Login Page
 * Azure AD authentication entry point
 */

import { useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';


export const LoginPage = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <div className="k-loading k-loading-lg" />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#f5f5f5'
    }}>
      <div style={{
        background: 'white',
        padding: '3rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h1 style={{ marginBottom: '1rem', color: '#333' }}>Booking Portal</h1>
        <p style={{ marginBottom: '2rem', color: '#666' }}>
          Document Processing & Validation
        </p>
        <button
          className="btn-primary"
          onClick={handleLogin}
          style={{ width: '100%', padding: '12px', fontSize: '16px' }}
        >
          Sign in with Microsoft
        </button>
        <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#999' }}>
          CTN Association Register
        </p>
      </div>
    </div>
  );
};
