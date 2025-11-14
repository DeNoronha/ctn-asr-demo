import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Select,
  TextInput,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { IconKey } from '@tabler/icons-react';
import { DataTable, useDataTableColumns } from 'mantine-datatable';
import React, { useEffect, useState } from 'react';

import { helpContent } from '../config/helpContent';
import { useNotification } from '../contexts/NotificationContext';
import { type EndpointAuthorization, type LegalEntityEndpoint, apiV2 } from '../services/apiV2';
import { announceToScreenReader } from '../utils/aria';
import { formatDateTime } from '../utils/dateFormat';
import { getEmptyState } from '../utils/emptyStates';
import { endpointSuccessMessages, tokenSuccessMessages } from '../utils/successMessages';
import { EmptyState } from './EmptyState';
import { ErrorBoundary } from './ErrorBoundary';
import { HelpTooltip } from './help/HelpTooltip';
import { Plus } from './icons';
import { defaultDataTableProps, defaultPaginationOptions } from './shared/DataTableConfig';
import './EndpointManagement.css';

interface EndpointManagementProps {
  legalEntityId: string;
  legalEntityName: string;
}

const DATA_CATEGORIES = [
  { value: 'CONTAINER', label: 'Container Tracking' },
  { value: 'CUSTOMS', label: 'Customs' },
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'FINANCIAL', label: 'Financial' },
  { value: 'GENERAL', label: 'General' },
];

const EndpointManagementComponent: React.FC<EndpointManagementProps> = ({
  legalEntityId,
  legalEntityName,
}) => {
  const [endpoints, setEndpoints] = useState<LegalEntityEndpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<LegalEntityEndpoint | null>(null);
  const [newToken, setNewToken] = useState<EndpointAuthorization | null>(null);
  const notification = useNotification();

  const [formData, setFormData] = useState({
    endpoint_name: '',
    endpoint_url: '',
    endpoint_description: '',
    data_category: 'CONTAINER',
    endpoint_type: 'REST_API',
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: Load function is stable, depends only on legalEntityId
  useEffect(() => {
    loadEndpoints();
  }, [legalEntityId]);

  const loadEndpoints = async () => {
    setLoading(true);
    try {
      const endpoints = await apiV2.getEndpoints(legalEntityId);
      setEndpoints(endpoints);
    } catch (error) {
      console.error('Error loading endpoints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEndpoint = async () => {
    setLoading(true);
    try {
      await apiV2.addEndpoint({
        legal_entity_id: legalEntityId,
        endpoint_name: formData.endpoint_name,
        endpoint_url: formData.endpoint_url,
        endpoint_description: formData.endpoint_description,
        data_category: (formData.data_category ||
          'CONTAINER') as LegalEntityEndpoint['data_category'],
        endpoint_type: (formData.endpoint_type ||
          'REST_API') as LegalEntityEndpoint['endpoint_type'],
        is_active: true,
      });

      const msg = endpointSuccessMessages.created(formData.endpoint_url);
      notification.showSuccess(msg.title);
      setShowDialog(false);
      setFormData({
        endpoint_name: '',
        endpoint_url: '',
        endpoint_description: '',
        data_category: 'CONTAINER',
        endpoint_type: 'REST_API',
      });
      loadEndpoints();
    } catch (error: unknown) {
      console.error('Error creating endpoint:', error);
      const err = error as { response?: { data?: { error?: string } } };
      notification.showError(err.response?.data?.error || 'Failed to create endpoint');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueToken = async (endpoint: LegalEntityEndpoint) => {
    if (!endpoint.legal_entity_endpoint_id) {
      notification.showError('Invalid endpoint - missing ID');
      return;
    }
    setLoading(true);
    try {
      const token = await apiV2.issueEndpointToken(endpoint.legal_entity_endpoint_id);
      setNewToken(token);
      setSelectedEndpoint(endpoint);
      setShowTokenDialog(true);
      const msg = tokenSuccessMessages.generated();
      notification.showSuccess(msg.title);
      try {
        announceToScreenReader(
          'API token generated. Copy it now, it will not be shown again.',
          'assertive'
        );
      } catch {}
    } catch (error) {
      console.error('Error issuing token:', error);
      notification.showError('Failed to issue token');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    const msg = tokenSuccessMessages.copied();
    notification.showSuccess(msg.title);
    try {
      announceToScreenReader('Token copied to clipboard.');
    } catch {}
  };

  // mantine-datatable column definitions
  const { effectiveColumns } = useDataTableColumns<LegalEntityEndpoint>({
    key: 'endpoints-grid',
    columns: [
      {
        accessor: 'endpoint_name',
        title: 'Endpoint Name',
        width: 250,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'endpoint_url',
        title: 'URL',
        width: 300,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'data_category',
        title: 'Category',
        width: 150,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'endpoint_type',
        title: 'Type',
        width: 120,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'is_active',
        title: 'Status',
        width: 120,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (endpoint) => (
          <div>
            <span className={`status-badge ${endpoint.is_active ? 'active' : 'inactive'}`}>
              {endpoint.is_active ? '● Active' : '○ Inactive'}
            </span>
          </div>
        ),
      },
      {
        accessor: 'dt_created',
        title: 'Created',
        width: 180,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (endpoint) => <div>{formatDateTime(endpoint.dt_created)}</div>,
      },
      {
        accessor: 'legal_entity_endpoint_id',
        title: 'Actions',
        width: '0%',
        toggleable: false,
        sortable: false,
        render: (endpoint) => (
          <Group gap={4} wrap="nowrap">
            <Tooltip label={`Issue token for ${endpoint.endpoint_name}`}>
              <ActionIcon
                variant="subtle"
                color="blue"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleIssueToken(endpoint);
                }}
                disabled={loading}
                aria-label={`Issue token for ${endpoint.endpoint_name}`}
              >
                <IconKey size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
  });

  return (
    <div className="endpoint-management">
      <div className="endpoint-header">
        <div>
          <h2>System Endpoints</h2>
          <p className="entity-name">{legalEntityName}</p>
        </div>
        <Button
          color="blue"
          onClick={() => setShowDialog(true)}
          disabled={loading}
          aria-label="Register new endpoint"
        >
          <Plus size={16} />
          Register Endpoint
        </Button>
      </div>

      {endpoints.length === 0 ? (
        (() => {
          const es = getEmptyState('endpoint', 'noEndpoints');
          return (
            <EmptyState
              message={es.message}
              hint={es.hint}
              action={
                es.action
                  ? { label: es.action.label, onClick: () => setShowDialog(true) }
                  : undefined
              }
            />
          );
        })()
      ) : (
        <ErrorBoundary>
          <DataTable
            {...defaultDataTableProps}
            records={endpoints}
            columns={effectiveColumns}
            fetching={loading}
            storeColumnsKey="endpoints-grid"
          />
        </ErrorBoundary>
      )}

      <Modal
        opened={showDialog}
        onClose={() => setShowDialog(false)}
        title="Register New Endpoint"
        size="lg"
      >
        <div className="endpoint-form">
          <div className="form-field">
            <TextInput
              label="Endpoint Name *"
              value={formData.endpoint_name}
              onChange={(e) => setFormData({ ...formData, endpoint_name: e.target.value })}
              placeholder="e.g., Container Tracking System"
            />
          </div>

          <div className="form-field">
            <TextInput
              label={
                <>
                  Endpoint URL *
                  <HelpTooltip content={helpContent.endpointUrl} dataTestId="endpoint-url-help" />
                </>
              }
              value={formData.endpoint_url}
              onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
              placeholder="https://your-system.com/api"
            />
          </div>

          <div className="form-field">
            <Textarea
              label="Description"
              value={formData.endpoint_description}
              onChange={(e) => setFormData({ ...formData, endpoint_description: e.target.value })}
              placeholder="Brief description of this endpoint"
              rows={3}
            />
          </div>

          <div className="form-field">
            <Select
              label="Data Category *"
              data={DATA_CATEGORIES}
              value={formData.data_category}
              onChange={(value) => setFormData({ ...formData, data_category: value || '' })}
            />
          </div>
        </div>

        <Group mt="xl" justify="flex-end">
          <Button
            onClick={() => setShowDialog(false)}
            variant="default"
            aria-label="Cancel endpoint registration"
          >
            Cancel
          </Button>
          <Button
            color="blue"
            onClick={handleCreateEndpoint}
            disabled={!formData.endpoint_name || !formData.endpoint_url || loading}
            aria-label="Save and register endpoint"
          >
            Register Endpoint
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={showTokenDialog && !!newToken && !!selectedEndpoint}
        onClose={() => setShowTokenDialog(false)}
        title="Token Issued Successfully"
        size="xl"
      >
        {newToken && selectedEndpoint && (
          <>
            <div className="token-display">
              <p className="success-message">
                ✅ New token issued for <strong>{selectedEndpoint.endpoint_name}</strong>
              </p>

              <div className="token-info">
                <strong>Token Value:</strong>
                <div className="token-value-container">
                  <code className="token-value">{newToken.token_value}</code>
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(newToken.token_value)}
                    aria-label="Copy token to clipboard"
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div className="token-details">
                <div className="token-detail">
                  <strong>Type:</strong> {newToken.token_type}
                </div>
                <div className="token-detail">
                  <strong>Issued:</strong> {formatDateTime(newToken.issued_at)}
                </div>
                <div className="token-detail">
                  <strong>Expires:</strong> {formatDateTime(newToken.expires_at)}
                </div>
              </div>

              <div className="token-warning">
                ⚠️ <strong>Important:</strong> Save this token securely. It won't be displayed again.
              </div>
            </div>

            <Group mt="xl" justify="flex-end">
              <Button
                color="blue"
                onClick={() => setShowTokenDialog(false)}
                aria-label="Close token dialog"
              >
                Done
              </Button>
            </Group>
          </>
        )}
      </Modal>
    </div>
  );
};

export const EndpointManagement = React.memo(EndpointManagementComponent);
