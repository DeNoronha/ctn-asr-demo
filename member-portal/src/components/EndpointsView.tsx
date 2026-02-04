import { AsrApiClient } from '@ctn/api-client';
import { ActionIcon, Badge, Button, Group, Modal, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCloudOff, IconCloudUpload, IconUsers } from '@tabler/icons-react';
import { DataTable } from 'mantine-datatable';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [publishing, setPublishing] = useState<string | null>(null);

  // Initialize API client for lifecycle actions
  const lifecycleClient = useMemo(
    () =>
      new AsrApiClient({
        baseURL: apiBaseUrl,
        getAccessToken,
        retryAttempts: 3,
      }),
    [apiBaseUrl, getAccessToken]
  );

  const loadEndpoints = useCallback(async () => {
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
  }, [onNotification]);

  useEffect(() => {
    loadEndpoints();
  }, [loadEndpoints]);

  const handleAdd = () => {
    setShowDialog(true);
  };

  const handlePublish = useCallback(
    async (endpoint: Endpoint) => {
      setPublishing(endpoint.legal_entity_endpoint_id);
      try {
        await lifecycleClient.endpoints.publish(endpoint.legal_entity_endpoint_id);
        notifications.show({
          title: 'Endpoint Published',
          message: `${endpoint.endpoint_name} is now visible in the CTN directory.`,
          color: 'green',
        });
        await loadEndpoints();
        onDataChange();
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        const msg = err?.response?.data?.error || err?.message || 'Failed to publish endpoint';
        notifications.show({
          title: 'Publish Failed',
          message: msg,
          color: 'red',
        });
      } finally {
        setPublishing(null);
      }
    },
    [lifecycleClient, loadEndpoints, onDataChange]
  );

  const handleUnpublish = useCallback(
    async (endpoint: Endpoint) => {
      setPublishing(endpoint.legal_entity_endpoint_id);
      try {
        await lifecycleClient.endpoints.unpublish(endpoint.legal_entity_endpoint_id);
        notifications.show({
          title: 'Endpoint Unpublished',
          message: `${endpoint.endpoint_name} has been removed from the CTN directory.`,
          color: 'blue',
        });
        await loadEndpoints();
        onDataChange();
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        const msg = err?.response?.data?.error || err?.message || 'Failed to unpublish endpoint';
        notifications.show({
          title: 'Unpublish Failed',
          message: msg,
          color: 'red',
        });
      } finally {
        setPublishing(null);
      }
    },
    [lifecycleClient, loadEndpoints, onDataChange]
  );

  const columns = useMemo(
    () => [
      {
        accessor: 'endpoint_name',
        title: 'Name',
        width: 180,
        render: (endpoint: Endpoint) => <strong>{endpoint.endpoint_name}</strong>,
      },
      {
        accessor: 'endpoint_url',
        title: 'URL',
        width: 250,
        render: (endpoint: Endpoint) => (
          <span style={{ fontSize: '0.85rem' }}>{endpoint.endpoint_url}</span>
        ),
      },
      {
        accessor: 'endpoint_type',
        title: 'Type',
        width: 100,
      },
      {
        accessor: 'data_category',
        title: 'Category',
        width: 120,
        render: (endpoint: Endpoint) => endpoint.data_category || '-',
      },
      {
        accessor: 'access_model',
        title: 'Access',
        width: 100,
        render: (endpoint: Endpoint) => {
          const model = endpoint.access_model || 'open';
          const colors: Record<string, string> = {
            open: 'green',
            restricted: 'yellow',
            private: 'red',
          };
          return (
            <Badge color={colors[model] || 'gray'} variant="light" size="sm">
              {model}
            </Badge>
          );
        },
      },
      {
        accessor: 'publication_status',
        title: 'Publication',
        width: 110,
        render: (endpoint: Endpoint) => {
          const status = endpoint.publication_status || 'draft';
          const colors: Record<string, string> = {
            draft: 'gray',
            published: 'blue',
            unpublished: 'orange',
          };
          return (
            <Badge color={colors[status] || 'gray'} variant="light" size="sm">
              {status}
            </Badge>
          );
        },
      },
      {
        accessor: 'verification_status',
        title: 'Verified',
        width: 100,
        render: (endpoint: Endpoint) => {
          const status = endpoint.verification_status || 'PENDING';
          const colors: Record<string, string> = {
            PENDING: 'gray',
            SENT: 'yellow',
            VERIFIED: 'green',
            FAILED: 'red',
            EXPIRED: 'orange',
          };
          return (
            <Badge color={colors[status] || 'gray'} variant="light" size="sm">
              {status}
            </Badge>
          );
        },
      },
      {
        accessor: 'is_active',
        title: 'Status',
        width: 90,
        render: (endpoint: Endpoint) => (
          <Badge color={endpoint.is_active ? 'green' : 'red'} variant="light" size="sm">
            {endpoint.is_active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        accessor: 'actions',
        title: 'Actions',
        width: 100,
        render: (endpoint: Endpoint) => {
          const isVerified = endpoint.verification_status === 'VERIFIED';
          const isPublished = endpoint.publication_status === 'published';
          const isLoading = publishing === endpoint.legal_entity_endpoint_id;

          return (
            <Group gap="xs">
              {isVerified && !isPublished && (
                <Tooltip label="Publish to CTN Directory">
                  <ActionIcon
                    variant="light"
                    color="blue"
                    size="sm"
                    loading={isLoading}
                    onClick={() => handlePublish(endpoint)}
                  >
                    <IconCloudUpload size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
              {isPublished && (
                <Tooltip label="Unpublish from Directory">
                  <ActionIcon
                    variant="light"
                    color="orange"
                    size="sm"
                    loading={isLoading}
                    onClick={() => handleUnpublish(endpoint)}
                  >
                    <IconCloudOff size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
              {isPublished && endpoint.access_model !== 'open' && (
                <Tooltip label="View Access Requests">
                  <ActionIcon
                    variant="light"
                    color="grape"
                    size="sm"
                    onClick={() => {
                      // TODO: Open access requests modal
                      notifications.show({
                        title: 'Coming Soon',
                        message: 'Access request management will be available soon.',
                        color: 'blue',
                      });
                    }}
                  >
                    <IconUsers size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          );
        },
      },
    ],
    [publishing, handlePublish, handleUnpublish]
  );

  return (
    <div className="endpoints-view">
      <div className="page-header">
        <div>
          <h2>Step 2: Publish Your Endpoints</h2>
          <p className="page-subtitle">
            Register, verify, and publish your data endpoints to the CTN Directory for other members
            to discover
          </p>
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
