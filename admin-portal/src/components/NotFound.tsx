import { Button } from '@mantine/core';

import { Home, Search } from './icons';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import './NotFound.css';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <div className="error-code">404</div>
        <h1>Page Not Found</h1>
        <p className="error-message">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="action-buttons">
          <Button
            color="blue"
            size="lg"
            onClick={() => navigate('/')}
          >
            <Home size={18} style={{ marginRight: '0.5rem' }} />
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(-1)}
          >
            <Search size={18} style={{ marginRight: '0.5rem' }} />
            Go Back
          </Button>
        </div>

        <div className="help-text">
          <p>Need help? Check these common pages:</p>
          <ul>
            <li><button type="button" onClick={() => navigate('/dashboard')}>Dashboard</button></li>
            <li><button type="button" onClick={() => navigate('/members')}>Members</button></li>
            <li><button type="button" onClick={() => navigate('/about')}>About</button></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
