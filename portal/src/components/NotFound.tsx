import { Button } from '@progress/kendo-react-buttons';
import { Home } from 'lucide-react';
import type React from 'react';

interface NotFoundProps {
  onGoHome?: () => void;
}

const NotFound: React.FC<NotFoundProps> = ({ onGoHome }) => {
  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      textAlign: 'center',
      padding: '2rem',
      background: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{ fontSize: '6rem', fontWeight: '800', color: '#667eea', lineHeight: 1, marginBottom: '1rem' }}>
        404
      </div>
      <h2 style={{ fontSize: '2rem', color: '#2d3748', marginBottom: '1rem' }}>
        Page Not Found
      </h2>
      <p style={{ fontSize: '1.125rem', color: '#4a5568', marginBottom: '2rem' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button
        themeColor="primary"
        size="large"
        onClick={handleGoHome}
      >
        <Home size={18} style={{ marginRight: '0.5rem' }} />
        Go to Dashboard
      </Button>
    </div>
  );
};

export default NotFound;
