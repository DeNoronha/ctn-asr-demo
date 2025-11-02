import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { DataTable, useDataTableColumns } from 'mantine-datatable';
import { Button, Loader } from '@mantine/core';

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

  // Column definitions for mantine-datatable
  const { effectiveColumns } = useDataTableColumns<Booking>({
    key: 'bookings-grid',
    columns: [
      {
        accessor: 'carrierBookingReference',
        title: 'Booking Reference',
        width: 180,
        sortable: true,
        render: (booking) => booking.carrierBookingReference || booking.documentNumber || '-',
      },
      {
        accessor: 'containerNumber',
        title: 'Container',
        width: 150,
        sortable: true,
        render: (booking) => booking.containerNumber || '-',
      },
      {
        accessor: 'uploadTimestamp',
        title: 'Uploaded',
        width: 180,
        sortable: true,
        render: (booking) => new Date(booking.uploadTimestamp).toLocaleString(),
      },
      {
        accessor: 'processingStatus',
        title: 'Status',
        width: 120,
        sortable: true,
        render: (booking) => {
          const status = booking.processingStatus;
          const badgeColor =
            status === 'validated' ? '#10b981' :
            status === 'pending' ? '#f59e0b' :
            '#3b82f6';

          return (
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '12px',
                backgroundColor: badgeColor,
                color: 'white',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              {status}
            </span>
          );
        },
      },
      {
        accessor: 'confidenceScore',
        title: 'Confidence',
        width: 120,
        sortable: true,
        render: (booking) => {
          const confidence = booking.confidenceScore || 0;
          const percentage = (confidence * 100).toFixed(1);
          const color = confidence >= 0.90 ? '#10b981' : confidence >= 0.80 ? '#f59e0b' : '#ef4444';

          return (
            <span style={{ color, fontWeight: 600 }}>
              {percentage}%
            </span>
          );
        },
      },
      {
        accessor: 'actions',
        title: 'Actions',
        width: 120,
        render: (booking) => (
          <Button
            color={booking.processingStatus === 'pending' ? 'blue' : 'gray'}
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/validate/${booking.id}`);
            }}
            aria-label={`${booking.processingStatus === 'pending' ? 'Validate' : 'View'} booking ${booking.carrierBookingReference || booking.documentNumber}`}
          >
            {booking.processingStatus === 'pending' ? 'Validate' : 'View'}
          </Button>
        ),
      },
    ],
  });

  return (
    <div>
      <Breadcrumb />
      <div className="card-header" style={{ marginBottom: '24px' }}>
        <h2>Bookings</h2>
        <div role="group" aria-label="Filter bookings by status" style={{ display: 'flex', gap: '8px' }}>
          <Button
            color={!statusFilter ? 'blue' : 'gray'}
            variant={!statusFilter ? 'filled' : 'outline'}
            onClick={() => navigate('/bookings')}
            aria-label="Show all bookings"
            aria-pressed={!statusFilter}
          >
            All
          </Button>
          <Button
            color={statusFilter === 'pending' ? 'blue' : 'gray'}
            variant={statusFilter === 'pending' ? 'filled' : 'outline'}
            onClick={() => navigate('/bookings?status=pending')}
            aria-label="Show pending bookings"
            aria-pressed={statusFilter === 'pending'}
          >
            Pending
          </Button>
          <Button
            color={statusFilter === 'validated' ? 'blue' : 'gray'}
            variant={statusFilter === 'validated' ? 'filled' : 'outline'}
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
            <Loader size="lg" type="infinite-spinner" />
            <p style={{ color: '#64748b', marginTop: '16px' }}>Loading bookings...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ color: '#ef4444', fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h3 style={{ color: '#ef4444', marginBottom: '8px' }}>Error Loading Bookings</h3>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>{error}</p>
            <Button color="blue" onClick={loadBookings}>
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
          <DataTable
            records={bookings}
            columns={effectiveColumns}
            storeColumnsKey="bookings-grid"
            withTableBorder
            striped
            highlightOnHover
            noRecordsText="No bookings found"
            minHeight={200}
          />
        )}
      </div>
    </div>
  );
};

export default Bookings;
