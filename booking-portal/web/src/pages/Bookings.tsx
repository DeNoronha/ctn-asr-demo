import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Grid, GridColumn as Column, GridCellProps, GridNoRecords } from '@progress/kendo-react-grid';
import { Button } from '@progress/kendo-react-buttons';
import { Loader } from '@progress/kendo-react-indicators';
import Breadcrumb from '../components/Breadcrumb';
import EmptyState from '../components/EmptyState';

interface Booking {
  id: string;
  documentType: string;
  documentNumber: string;
  carrier: string;
  containerNumber?: string;
  carrierBookingReference?: string;
  uploadTimestamp: string;
  processingStatus: string;
  confidenceScore: number;
  data?: {
    carrierBookingReference?: string;
    containers?: Array<{ containerNumber?: string }>;
  };
  extractionMetadata?: {
    confidenceScore?: number;
  };
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

  // Custom cell renderers
  const StatusCell = (props: GridCellProps) => {
    const status = props.dataItem.processingStatus;
    return (
      <td>
        <span className={`k-badge k-badge-solid ${
          status === 'validated' ? 'k-badge-success' :
          status === 'pending' ? 'k-badge-warning' :
          'k-badge-info'
        }`}>
          {status}
        </span>
      </td>
    );
  };

  const ConfidenceCell = (props: GridCellProps) => {
    const confidence = props.dataItem.confidenceScore || 0;
    const percentage = (confidence * 100).toFixed(1);
    const color = confidence >= 0.90 ? '#10b981' : confidence >= 0.80 ? '#f59e0b' : '#ef4444';

    return (
      <td style={{ color, fontWeight: 600 }}>
        {percentage}%
      </td>
    );
  };

  const ActionsCell = (props: GridCellProps) => {
    const booking = props.dataItem;
    return (
      <td>
        {booking.processingStatus === 'pending' ? (
          <Button
            themeColor="primary"
            size="small"
            onClick={() => navigate(`/validate/${booking.id}`)}
            aria-label={`Validate booking ${booking.carrierBookingReference || booking.documentNumber}`}
          >
            Validate
          </Button>
        ) : (
          <Button
            themeColor="base"
            size="small"
            onClick={() => navigate(`/validate/${booking.id}`)}
            aria-label={`View booking ${booking.carrierBookingReference || booking.documentNumber}`}
          >
            View
          </Button>
        )}
      </td>
    );
  };

  const DateCell = (props: GridCellProps) => {
    const date = new Date(props.dataItem[props.field!]);
    return (
      <td>
        {date.toLocaleString()}
      </td>
    );
  };

  const BookingRefCell = (props: GridCellProps) => {
    const booking = props.dataItem;
    return (
      <td>
        {booking.carrierBookingReference || booking.documentNumber || '-'}
      </td>
    );
  };

  const ContainerCell = (props: GridCellProps) => {
    const booking = props.dataItem;
    return (
      <td>
        {booking.containerNumber || '-'}
      </td>
    );
  };

  return (
    <div>
      <Breadcrumb />
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <h2>Bookings</h2>
        <div role="group" aria-label="Filter bookings by status" style={{ display: 'flex', gap: '8px' }}>
          <Button
            themeColor={!statusFilter ? 'primary' : 'base'}
            fillMode={!statusFilter ? 'solid' : 'flat'}
            onClick={() => navigate('/bookings')}
            aria-label="Show all bookings"
            aria-pressed={!statusFilter}
          >
            All
          </Button>
          <Button
            themeColor={statusFilter === 'pending' ? 'primary' : 'base'}
            fillMode={statusFilter === 'pending' ? 'solid' : 'flat'}
            onClick={() => navigate('/bookings?status=pending')}
            aria-label="Show pending bookings"
            aria-pressed={statusFilter === 'pending'}
          >
            Pending
          </Button>
          <Button
            themeColor={statusFilter === 'validated' ? 'primary' : 'base'}
            fillMode={statusFilter === 'validated' ? 'solid' : 'flat'}
            onClick={() => navigate('/bookings?status=validated')}
            aria-label="Show validated bookings"
            aria-pressed={statusFilter === 'validated'}
          >
            Validated
          </Button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <Loader size="large" type="infinite-spinner" />
            <p style={{ color: '#64748b', marginTop: '16px' }}>Loading bookings...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ color: '#ef4444', fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ color: '#ef4444', marginBottom: '8px' }}>Error Loading Bookings</h3>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>{error}</p>
            <Button themeColor="primary" onClick={loadBookings}>
              Retry
            </Button>
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            title="No bookings found"
            description={
              statusFilter
                ? `No ${statusFilter} bookings at the moment. Try selecting a different filter or upload a new document.`
                : 'Upload your first document to get started with automated booking extraction and validation.'
            }
            actionButton={
              <Link to="/upload">
                <button className="btn-primary" aria-label="Upload new document">
                  Upload Document
                </button>
              </Link>
            }
            icon="📋"
          />
        ) : (
          <Grid
            data={bookings}
            style={{ height: 'auto' }}
            scrollable="virtual"
            rowHeight={40}
            pageSize={50}
          >
            <GridNoRecords>
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                No bookings found
              </div>
            </GridNoRecords>
            <Column field="carrierBookingReference" title="Booking Reference" cells={{ data: BookingRefCell }} />
            <Column field="containerNumber" title="Container" cells={{ data: ContainerCell }} />
            <Column field="uploadTimestamp" title="Uploaded" cells={{ data: DateCell }} width="180px" />
            <Column field="processingStatus" title="Status" cells={{ data: StatusCell }} width="120px" />
            <Column field="confidenceScore" title="Confidence" cells={{ data: ConfidenceCell }} width="120px" />
            <Column title="Actions" cells={{ data: ActionsCell }} width="120px" />
          </Grid>
        )}
      </div>
    </div>
  );
};

export default Bookings;
