/**
 * Login Page Component
 * Azure Entra ID authentication with MFA requirement notice
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@progress/kendo-react-buttons';
import { useAuth } from '../../auth/AuthContext';
import { Key, Shield, AlertCircle } from 'lucide-react';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated } = useAuth();
  const [error, setError] = useState<string>('');

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    try {
      setError('');
      await login();
      navigate('/'); // Redirect to home after successful login
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Key size={48} className="login-icon" />
          <h1>CTN Association Register</h1>
          <p className="login-subtitle">Secure Authentication Portal</p>
        </div>

        <div className="login-info-box">
          <Shield size={20} />
          <div>
            <h3>Security Requirements</h3>
            <ul>
              <li>All users must register via Member Portal first</li>
              <li>Multi-Factor Authentication (MFA) is required</li>
              <li>Cloud-based Azure Entra ID authentication</li>
            </ul>
          </div>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <Button
          className="login-button"
          themeColor="primary"
          size="large"
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign in with Microsoft'}
        </Button>

        <div className="login-footer">
          <p>Don't have an account?</p>
          <a href="/member-portal/register">Register on Member Portal</a>
        </div>
      </div>
    </div>
  );
};
