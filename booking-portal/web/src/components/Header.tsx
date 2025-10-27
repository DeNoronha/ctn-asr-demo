import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from './ThemeToggle';


const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <h1>CTN DocuFlow</h1>
        <nav aria-label="Main navigation" style={{ display: 'flex', gap: '16px' }}>
          <Link
            to="/dashboard"
            style={{ color: 'white', textDecoration: 'none' }}
            aria-label="Go to dashboard"
          >
            Dashboard
          </Link>
          <Link
            to="/upload"
            style={{ color: 'white', textDecoration: 'none' }}
            aria-label="Upload document"
          >
            Upload
          </Link>
          <Link
            to="/bookings"
            style={{ color: 'white', textDecoration: 'none' }}
            aria-label="View documents"
          >
            Documents
          </Link>
          <Link
            to="/admin"
            style={{ color: 'white', textDecoration: 'none' }}
            aria-label="Go to admin panel"
          >
            Admin
          </Link>
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user?.tenantId && (
          <span className="header-subtitle" aria-label="Current tenant">
            {user.tenantId}
          </span>
        )}
        <ThemeToggle />
        <div
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
          }}
          aria-label="User information"
        >
          <div>{user?.name || user?.email}</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
            {user?.primaryRole}
          </div>
        </div>
        <button
          className="btn-secondary"
          onClick={logout}
          style={{
            background: 'transparent',
            color: 'white',
            border: '1px solid white',
            padding: '8px 16px'
          }}
          aria-label="Logout from application"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
