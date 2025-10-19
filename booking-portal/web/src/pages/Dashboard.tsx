import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@progress/kendo-react-buttons';

interface DashboardStats {
  totalBookings: number;
  pendingValidation: number;
  validatedToday: number;
  averageConfidence: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    pendingValidation: 0,
    validatedToday: 0,
    averageConfidence: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // In production, fetch from API
      // For demo, use mock data
      setStats({
        totalBookings: 247,
        pendingValidation: 12,
        validatedToday: 8,
        averageConfidence: 87.3
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <h2>Dashboard</h2>
        <Link to="/upload">
          <Button themeColor="primary">Upload Document</Button>
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Bookings</h3>
          <div className="stat-value">{stats.totalBookings}</div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <h3>Pending Validation</h3>
          <div className="stat-value" style={{ color: '#f59e0b' }}>
            {stats.pendingValidation}
          </div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
          <h3>Validated Today</h3>
          <div className="stat-value" style={{ color: '#10b981' }}>
            {stats.validatedToday}
          </div>
        </div>

        <div className="stat-card" style={{ borderLeftColor: '#00a3e0' }}>
          <h3>Avg Confidence</h3>
          <div className="stat-value" style={{ color: '#00a3e0' }}>
            {stats.averageConfidence}%
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '16px' }}>Recent Activity</h2>
        <div style={{ color: '#64748b', fontSize: '14px' }}>
          <p>• 2 documents uploaded in the last hour</p>
          <p>• 5 bookings validated today</p>
          <p>• 3 documents pending review</p>
          <p>• Model confidence improved by 2.1% this week</p>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '16px' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/upload">
            <Button themeColor="primary">Upload New Document</Button>
          </Link>
          <Link to="/bookings?status=pending">
            <Button themeColor="secondary">Review Pending ({stats.pendingValidation})</Button>
          </Link>
          <Link to="/bookings">
            <Button>View All Bookings</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
