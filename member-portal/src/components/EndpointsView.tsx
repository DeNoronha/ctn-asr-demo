import { Badge, Button, Modal } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/apiClient';
import type { ComponentProps, Endpoint } from '../types';
import { EndpointRegistrationWizard } from './EndpointRegistrationWizard';
import { Plus } from './icons';
import { LoadingState } from './shared/LoadingState';

export const EndpointsView: React.FC<ComponentProps> = ({
  apiBaseUrl,
  getAccessToken,
  memberData,
  onNotification,
  onDataChange,
}) => {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    loadEndpoints();
  }, []);

  const loadEndpoints = async () => {
    setLoading(true);
    try {
      const data = await apiClient.member.getEndpoints();
      setEndpoints(data.endpoints || []);
    } catch (error) {
      console.error('Error loading endpoints:', error);
      onNotification('Failed to load endpoints', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setShowDialog(true);
  };

  const columns = useMemo(
    () => [
      {
        accessor: 'endpoint_name',
        title: 'Name',
        width: 200,
        render: (endpoint: Endpoint) => <strong>{endpoint.endpoint_name}</strong>,
      },
      {
        accessor: 'endpoint_url',
        title: 'URL',
        width: 300,
        render: (endpoint: Endpoint) => (
          <span style={{ fontSize: '0.85rem' }}>{endpoint.endpoint_url}</span>
        ),
      },
      {
        accessor: 'endpoint_type',
        title: 'Type',
        width: 120,
      },
      {
        accessor: 'data_category',
        title: 'Category',
        width: 140,
        render: (endpoint: Endpoint) => endpoint.data_category || '-',
      },
      {
        accessor: 'authentication_method',
        title: 'Auth Method',
        width: 140,
        render: (endpoint: Endpoint) => endpoint.authentication_method || '-',
      },
      {
        accessor: 'last_connection_status',
        title: 'Last Test',
        width: 120,
        render: (endpoint: Endpoint) =>
          endpoint.last_connection_status ? (
            <Badge
              color={endpoint.last_connection_status === 'SUCCESS' ? 'green' : 'red'}
              variant="light"
            >
              {endpoint.last_connection_status}
            </Badge>
          ) : (
            <span style={{ color: '#9ca3af' }}>-</span>
          ),
      },
      {
        accessor: 'is_active',
        title: 'Status',
        width: 100,
        render: (endpoint: Endpoint) => (
          <Badge color={endpoint.is_active ? 'green' : 'red'} variant="light">
            {endpoint.is_active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <div className="endpoints-view">
      <div className="page-header">
        <div>
          <h2>Data Endpoints</h2>
          <p className="page-subtitle">Manage your organization's data endpoints</p>
        </div>
        <Button color="blue" onClick={handleAdd}>
          <Plus size={16} /> Add Endpoint
        </Button>
      </div>

      <div className="card">
        <LoadingState loading={loading && endpoints.length === 0} minHeight={300}>
          {endpoints.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: '#f9fafb',
                borderRadius: '8px',
              }}
            >
              <p style={{ fontSize: '1.125rem', fontWeight: 500, margin: '16px 0 8px 0' }}>
                No endpoints configured
              </p>
              <p style={{ color: '#6b7280', margin: 0 }}>
                Add your first data endpoint to enable integrations
              </p>
            </div>
          ) : (
            <DataTable records={endpoints} columns={columns} minHeight={400} fetching={loading} />
          )}
        </LoadingState>
      </div>

      <Modal
        opened={showDialog}
        onClose={() => setShowDialog(false)}
        title="Register New Endpoint"
        size="xl"
      >
        {memberData.legalEntityId ? (
          <EndpointRegistrationWizard
            legalEntityId={memberData.legalEntityId}
            apiBaseUrl={apiBaseUrl}
            getAccessToken={getAccessToken}
            onComplete={async () => {
              setShowDialog(false);
              onNotification('Endpoint registered successfully!', 'success');
              // Reload data immediately - the wizard already waited for API confirmation
              await loadEndpoints();
              onDataChange();
            }}
            onCancel={() => setShowDialog(false)}
          />
        ) : (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>Legal entity ID is required to register an endpoint.</p>
            <Button onClick={() => setShowDialog(false)} style={{ marginTop: '10px' }}>
              Close
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};
