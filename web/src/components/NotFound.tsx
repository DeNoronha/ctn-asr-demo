import { Button } from '@progress/kendo-react-buttons';
import { Home, Search } from 'lucide-react';
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
            themeColor="primary"
            size="large"
            onClick={() => navigate('/')}
            icon={() => <Home size={18} />}
          >
            Go to Dashboard
          </Button>
          <Button
            fillMode="outline"
            size="large"
            onClick={() => navigate(-1)}
            icon={() => <Search size={18} />}
          >
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
