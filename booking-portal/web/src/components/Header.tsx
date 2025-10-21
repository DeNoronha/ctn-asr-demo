import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';


const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <h1>CTN Booking Portal</h1>
        <nav style={{ display: 'flex', gap: '16px' }}>
          <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>
            Dashboard
          </Link>
          <Link to="/upload" style={{ color: 'white', textDecoration: 'none' }}>
            Upload
          </Link>
          <Link to="/bookings" style={{ color: 'white', textDecoration: 'none' }}>
            Bookings
          </Link>
          <Link to="/admin" style={{ color: 'white', textDecoration: 'none' }}>
            Admin
          </Link>
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user?.tenantId && (
          <span className="header-subtitle">{user.tenantId}</span>
        )}
        <div style={{
          padding: '8px 16px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end'
        }}>
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
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
