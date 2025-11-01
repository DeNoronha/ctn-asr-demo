/**
 * Unauthorized Access Page
 * Shown when user doesn't have required permissions
 */

import { Button } from '@mantine/core';

import { Home, LogOut, ShieldX } from '../icons';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import './Unauthorized.css';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="unauthorized-container">
      <div className="unauthorized-card">
        <ShieldX size={64} className="unauthorized-icon" />
        <h1>Access Denied</h1>

        <p className="unauthorized-message">You don't have permission to access this resource.</p>

        {user && (
          <div className="unauthorized-info">
            <p>
              <strong>Current Role:</strong> {user.primaryRole}
            </p>
            <p>
              <strong>Account:</strong> {user.account.username}
            </p>
          </div>
        )}

        <div className="unauthorized-actions">
          <Button color="blue" onClick={handleGoHome}>
            <Home size={18} style={{ marginRight: 8 }} />
            Go to Home
          </Button>
          <Button onClick={handleLogout}>
            <LogOut size={18} style={{ marginRight: 8 }} />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};
