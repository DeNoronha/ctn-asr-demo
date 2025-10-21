import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

interface Booking {
  id: string;
  documentId: string;
  containerNumber: string;
  carrierBookingReference: string;
  uploadTimestamp: string;
  processingStatus: string;
  overallConfidence: number;
}

const Bookings: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, [searchParams]);

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const status = searchParams.get('status');
      const url = status
        ? `/api/v1/bookings?status=${status}`
        : '/api/v1/bookings';

      const response = await axios.get<{ data: Booking[] }>(url);
      setBookings(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to load bookings:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load bookings';
      setError(errorMessage);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const statusFilter = searchParams.get('status');

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <h2>Bookings</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`filter-button ${!statusFilter ? 'active' : ''}`}
            onClick={() => navigate('/bookings')}
          >
            All
          </button>
          <button
            className={`filter-button ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => navigate('/bookings?status=pending')}
          >
            Pending
          </button>
          <button
            className={`filter-button ${statusFilter === 'validated' ? 'active' : ''}`}
            onClick={() => navigate('/bookings?status=validated')}
          >
            Validated
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            <div className="k-loading k-loading-lg" style={{ margin: '0 auto 16px' }} />
            <p>Loading bookings...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ color: '#ef4444', fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ color: '#ef4444', marginBottom: '8px' }}>Error Loading Bookings</h3>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>{error}</p>
            <button className="btn-primary" onClick={loadBookings}>
              Retry
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking Reference</th>
                  <th>Container</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      No bookings found
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>{booking.carrierBookingReference}</td>
                      <td>{booking.containerNumber}</td>
                      <td>{new Date(booking.uploadTimestamp).toLocaleString()}</td>
                      <td>
                        <span className={`status-badge status-${booking.processingStatus}`}>
                          {booking.processingStatus}
                        </span>
                      </td>
                      <td style={{
                        color: booking.overallConfidence >= 0.90 ? '#10b981' : '#f59e0b',
                        fontWeight: 600
                      }}>
                        {(booking.overallConfidence * 100).toFixed(1)}%
                      </td>
                      <td>
                        {booking.processingStatus === 'pending' ? (
                          <button
                            className="btn-primary btn-sm"
                            onClick={() => navigate(`/validate/${booking.id}`)}
                          >
                            Validate
                          </button>
                        ) : (
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => navigate(`/validate/${booking.id}`)}
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookings;
