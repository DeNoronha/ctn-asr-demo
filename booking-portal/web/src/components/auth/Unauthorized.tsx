/**
 * Unauthorized Page
 * Shown when user doesn't have required permissions
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '@progress/kendo-react-buttons';

export const UnauthorizedPage = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

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
        maxWidth: '500px'
      }}>
        <h1 style={{ marginBottom: '1rem', color: '#d32f2f' }}>Access Denied</h1>
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          You don't have permission to access this portal.
        </p>
        {user && (
          <p style={{ marginBottom: '2rem', fontSize: '0.875rem', color: '#999' }}>
            Signed in as: {user.email}
          </p>
        )}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Button onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
          <Button themeColor="error" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};
