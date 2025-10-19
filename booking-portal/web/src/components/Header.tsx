import { Link } from 'react-router-dom';

const Header: React.FC = () => {
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
        <span className="header-subtitle">ITG Hengelo</span>
        <div style={{
          padding: '8px 16px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.1)',
          color: 'white'
        }}>
          John Planner
        </div>
      </div>
    </header>
  );
};

export default Header;
