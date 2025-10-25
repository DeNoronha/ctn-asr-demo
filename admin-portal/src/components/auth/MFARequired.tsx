/**
 * MFA Required Page
 * Shown when user doesn't have MFA enabled
 */

import { Button } from '@progress/kendo-react-buttons';
import { ShieldAlert } from '../icons';
import type React from 'react';
import { useAuth } from '../../auth/AuthContext';
import './MFARequired.css';

export const MFARequiredPage: React.FC = () => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="mfa-container">
      <div className="mfa-card">
        <ShieldAlert size={64} className="mfa-icon" />
        <h1>Multi-Factor Authentication Required</h1>

        <div className="mfa-message">
          <p>
            Your account must have Multi-Factor Authentication (MFA) enabled to access this portal.
          </p>
          <p>Please enable MFA in your Microsoft account settings and try logging in again.</p>
        </div>

        <div className="mfa-steps">
          <h3>How to Enable MFA:</h3>
          <ol>
            <li>
              Go to{' '}
              <a
                href="https://mysignins.microsoft.com/security-info"
                target="_blank"
                rel="noopener noreferrer"
              >
                Microsoft Security Info
              </a>
            </li>
            <li>Click "Add sign-in method"</li>
            <li>Choose your preferred MFA method (Authenticator app, phone, etc.)</li>
            <li>Follow the setup instructions</li>
            <li>Return here and sign in again</li>
          </ol>
        </div>

        <Button themeColor="primary" size="large" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>
    </div>
  );
};
