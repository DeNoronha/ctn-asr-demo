import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
import { Button } from '@progress/kendo-react-buttons';
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

  useEffect(() => {
    loadBookings();
  }, [searchParams]);

  const loadBookings = async () => {
    try {
      const status = searchParams.get('status');
      const url = status
        ? `/api/v1/bookings?status=${status}`
        : '/api/v1/bookings';

      const response = await axios.get<{ data: Booking[] }>(url);
      setBookings(response.data.data || []);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      // Use mock data for demo
      setBookings([
        {
          id: 'booking-1',
          documentId: 'doc-1',
          containerNumber: 'OOLU3703895',
          carrierBookingReference: 'OOLU2649906690',
          uploadTimestamp: new Date().toISOString(),
          processingStatus: 'pending',
          overallConfidence: 0.87
        },
        {
          id: 'booking-2',
          documentId: 'doc-2',
          containerNumber: 'MAEU1234567',
          carrierBookingReference: 'MAEU9876543210',
          uploadTimestamp: new Date(Date.now() - 3600000).toISOString(),
          processingStatus: 'validated',
          overallConfidence: 0.95
        }
      ]);
    }
  };

  const StatusCell = (props: any) => {
    const status = props.dataItem.processingStatus;
    const className = `status-badge status-${status}`;
    return <td><span className={className}>{status}</span></td>;
  };

  const ConfidenceCell = (props: any) => {
    const confidence = (props.dataItem.overallConfidence * 100).toFixed(1);
    const color = props.dataItem.overallConfidence >= 0.90 ? '#10b981' : '#f59e0b';
    return <td style={{ color, fontWeight: 600 }}>{confidence}%</td>;
  };

  const ActionCell = (props: any) => {
    return (
      <td>
        {props.dataItem.processingStatus === 'pending' ? (
          <Button
            size="small"
            themeColor="primary"
            onClick={() => navigate(`/validate/${props.dataItem.id}`)}
          >
            Validate
          </Button>
        ) : (
          <Button
            size="small"
            onClick={() => navigate(`/validate/${props.dataItem.id}`)}
          >
            View
          </Button>
        )}
      </td>
    );
  };

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <h2>Bookings</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            togglable
            selected={!searchParams.get('status')}
            onClick={() => navigate('/bookings')}
          >
            All
          </Button>
          <Button
            togglable
            selected={searchParams.get('status') === 'pending'}
            onClick={() => navigate('/bookings?status=pending')}
          >
            Pending
          </Button>
          <Button
            togglable
            selected={searchParams.get('status') === 'validated'}
            onClick={() => navigate('/bookings?status=validated')}
          >
            Validated
          </Button>
        </div>
      </div>

      <div className="card">
        <Grid
          data={bookings}
          style={{ height: '600px' }}
        >
          <GridColumn field="carrierBookingReference" title="Booking Reference" width="200px" />
          <GridColumn field="containerNumber" title="Container" width="150px" />
          <GridColumn
            field="uploadTimestamp"
            title="Uploaded"
            width="180px"
            cell={(props: any) => (
              <td>{new Date(props.dataItem.uploadTimestamp).toLocaleString()}</td>
            )}
          />
          <GridColumn field="processingStatus" title="Status" width="120px" cell={StatusCell} />
          <GridColumn field="overallConfidence" title="Confidence" width="120px" cell={ConfidenceCell} />
          <GridColumn title="Actions" width="120px" cell={ActionCell} />
        </Grid>
      </div>
    </div>
  );
};

export default Bookings;
