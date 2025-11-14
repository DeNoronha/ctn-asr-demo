import { Button, Modal } from '@mantine/core';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { ComponentProps, Endpoint } from '../types';
import { EndpointRegistrationWizard } from './EndpointRegistrationWizard';
import { apiClient } from '../services/apiClient';
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
      console.log('Endpoints loaded:', data);
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

  return (
    <div className="endpoints-view">
      <div className="page-header">
        <div>
          <h2>Data Endpoints</h2>
          <p className="page-subtitle">Manage your organization's data endpoints</p>
        </div>
        <Button color="blue" onClick={handleAdd}>
          Add Endpoint
        </Button>
      </div>

      <div className="card">
        <LoadingState loading={loading} minHeight={300}>
          {endpoints.length === 0 ? (
            <div className="empty-state">
              <h3>No Endpoints</h3>
              <p>Add your first data endpoint to get started.</p>
            </div>
          ) : (
            <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>URL</th>
                <th>Type</th>
                <th>Category</th>
                <th>Auth Method</th>
                <th>Last Test</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((endpoint) => (
                <tr key={endpoint.legal_entity_endpoint_id}>
                  <td>
                    <strong>{endpoint.endpoint_name}</strong>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{endpoint.endpoint_url}</td>
                  <td>{endpoint.endpoint_type}</td>
                  <td>{endpoint.data_category || '-'}</td>
                  <td>{endpoint.authentication_method || '-'}</td>
                  <td>
                    {endpoint.last_connection_status ? (
                      <span
                        className={`status-badge ${endpoint.last_connection_status === 'SUCCESS' ? 'status-active' : 'status-inactive'}`}
                      >
                        {endpoint.last_connection_status}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    <span className={endpoint.is_active ? 'status-active' : 'status-inactive'}>
                      {endpoint.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          )}
        </LoadingState>
      </div>

      <Modal
        opened={showDialog}
        onClose={() => setShowDialog(false)}
        title="Register New Endpoint"
        size="xl"
      >
        <EndpointRegistrationWizard
          legalEntityId={memberData.legalEntityId!}
          apiBaseUrl={apiBaseUrl}
          getAccessToken={getAccessToken}
          onComplete={() => {
            setShowDialog(false);
            // Small delay to ensure API has finished processing
            setTimeout(() => {
              loadEndpoints();
              onDataChange();
            }, 500);
            onNotification('Endpoint registered successfully!', 'success');
          }}
          onCancel={() => setShowDialog(false)}
        />
      </Modal>
    </div>
  );
};
