import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Breadcrumb from '../components/Breadcrumb';
import EmptyState from '../components/EmptyState';

interface Booking {
  id: string;
  documentId: string;
  containerNumber: string;
  carrierBookingReference: string;
  uploadTimestamp: string;
  processingStatus: string;
  overallConfidence: number;
}

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get<{ data: Booking[] }>('/api/v1/bookings');
      const bookings = response.data.data || [];

      // Calculate stats from real data
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pendingCount = bookings.filter(b => b.processingStatus === 'pending').length;
      const validatedToday = bookings.filter(b => {
        const uploadDate = new Date(b.uploadTimestamp);
        uploadDate.setHours(0, 0, 0, 0);
        return b.processingStatus === 'validated' && uploadDate.getTime() === today.getTime();
      }).length;

      const avgConfidence = bookings.length > 0
        ? bookings.reduce((sum, b) => sum + (b.overallConfidence || 0), 0) / bookings.length * 100
        : 0;

      setStats({
        totalBookings: bookings.length,
        pendingValidation: pendingCount,
        validatedToday,
        averageConfidence: Math.round(avgConfidence * 10) / 10
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Fallback to zeros on error
      setStats({
        totalBookings: 0,
        pendingValidation: 0,
        validatedToday: 0,
        averageConfidence: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
        <div className="k-loading k-loading-lg" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: '#64748b' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb />
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <h2>Dashboard</h2>
        <Link to="/upload">
          <button className="btn-primary" aria-label="Upload new document">
            Upload Document
          </button>
        </Link>
      </div>

      {stats.totalBookings === 0 ? (
        <div className="card">
          <EmptyState
            title="No bookings yet"
            description="Upload your first document to get started with automated booking extraction and validation."
            actionButton={
              <Link to="/upload">
                <button className="btn-primary" aria-label="Upload your first document">
                  Upload First Document
                </button>
              </Link>
            }
            icon="📄"
          />
        </div>
      ) : (
        <>
          <div className="stats-grid" role="region" aria-label="Dashboard statistics">
            <div className="stat-card">
              <h3>Total Bookings</h3>
              <div className="stat-value" aria-label={`${stats.totalBookings} total bookings`}>
                {stats.totalBookings}
              </div>
            </div>

            <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
              <h3>Pending Validation</h3>
              <div className="stat-value" style={{ color: '#f59e0b' }} aria-label={`${stats.pendingValidation} bookings pending validation`}>
                {stats.pendingValidation}
              </div>
            </div>

            <div className="stat-card" style={{ borderLeftColor: '#10b981' }}>
              <h3>Validated Today</h3>
              <div className="stat-value" style={{ color: '#10b981' }} aria-label={`${stats.validatedToday} bookings validated today`}>
                {stats.validatedToday}
              </div>
            </div>

            <div className="stat-card" style={{ borderLeftColor: '#00a3e0' }}>
              <h3>Avg Confidence</h3>
              <div className="stat-value" style={{ color: '#00a3e0' }} aria-label={`${stats.averageConfidence}% average confidence score`}>
                {stats.averageConfidence}%
              </div>
            </div>
          </div>
        </>
      )}

      {stats.totalBookings > 0 && (
        <>
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
                <button className="btn-primary" aria-label="Upload new document">
                  Upload New Document
                </button>
              </Link>
              <Link to="/bookings?status=pending">
                <button className="btn-primary" aria-label={`Review ${stats.pendingValidation} pending bookings`}>
                  Review Pending ({stats.pendingValidation})
                </button>
              </Link>
              <Link to="/bookings">
                <button className="btn-primary" aria-label="View all bookings">
                  View All Bookings
                </button>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
