import { Button, TextInput, Textarea, Select, Modal, Group } from '@mantine/core';
import { MantineReactTable, type MRT_ColumnDef, useMantineReactTable } from 'mantine-react-table';
import { EmptyState } from './EmptyState';
import { Plus } from './icons';
import type React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { HelpTooltip } from './help/HelpTooltip';
import { helpContent } from '../config/helpContent';
import './EndpointManagement.css';
import { getEmptyState } from '../utils/emptyStates';
import { endpointSuccessMessages, tokenSuccessMessages } from '../utils/successMessages';
import { announceToScreenReader } from '../utils/aria';

// Auth helper
const getAccessToken = async (): Promise<string> => {
  const accounts = (window as any).msalInstance?.getAllAccounts();
  if (!accounts || accounts.length === 0) {
    throw new Error('No authenticated user');
  }
  const request = {
    scopes: ['api://d3037c11-a541-4f21-8862-8079137a0cde/.default'],
    account: accounts[0],
  };
  const response = await (window as any).msalInstance.acquireTokenSilent(request);
  return response.accessToken;
};

interface Endpoint {
  legal_entity_endpoint_id: string;
  endpoint_name: string;
  endpoint_url: string;
  data_category: string;
  endpoint_type: string;
  is_active: boolean;
  dt_created: string;
}

interface Token {
  endpoint_authorization_id: string;
  token_value: string;
  token_type: string;
  issued_at: string;
  expires_at: string;
  is_active: boolean;
}

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

export const EndpointManagement: React.FC<EndpointManagementProps> = ({
  legalEntityId,
  legalEntityName,
}) => {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [newToken, setNewToken] = useState<Token | null>(null);
  const notification = useNotification();

  const [formData, setFormData] = useState({
    endpoint_name: '',
    endpoint_url: '',
    endpoint_description: '',
    data_category: 'CONTAINER',
    endpoint_type: 'REST_API',
  });

  const API_BASE =
    import.meta.env.VITE_API_URL || 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1';

  useEffect(() => {
    loadEndpoints();
  }, [legalEntityId]);

  const loadEndpoints = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/legal-entities/${legalEntityId}/endpoints`, {
        headers: {
          'Authorization': `Bearer ${await getAccessToken()}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setEndpoints(data);
      }
    } catch (error) {
      console.error('Error loading endpoints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEndpoint = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/legal-entities/${legalEntityId}/endpoints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAccessToken()}`
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
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
      } else {
        const error = await response.json();
        notification.showError(error.error || 'Failed to create endpoint');
      }
    } catch (error) {
      console.error('Error creating endpoint:', error);
      notification.showError('Failed to create endpoint');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueToken = async (endpoint: Endpoint) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/endpoints/${endpoint.legal_entity_endpoint_id}/tokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAccessToken()}`
          },
          body: JSON.stringify({}),
        }
      );

      if (response.ok) {
        const token = await response.json();
        setNewToken(token);
        setSelectedEndpoint(endpoint);
        setShowTokenDialog(true);
        const msg = tokenSuccessMessages.generated();
        notification.showSuccess(msg.title);
        try { announceToScreenReader('API token generated. Copy it now, it will not be shown again.', 'assertive'); } catch {}
      } else {
        notification.showError('Failed to issue token');
      }
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
    try { announceToScreenReader('Token copied to clipboard.'); } catch {}
  };

  // Mantine React Table column definitions
  const columns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        accessorKey: 'endpoint_name',
        header: 'Endpoint Name',
        size: 250,
      },
      {
        accessorKey: 'endpoint_url',
        header: 'URL',
        size: 300,
      },
      {
        accessorKey: 'data_category',
        header: 'Category',
        size: 150,
      },
      {
        accessorKey: 'endpoint_type',
        header: 'Type',
        size: 120,
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        size: 120,
        Cell: ({ row }) => (
          <div>
            <span className={`status-badge ${row.original.is_active ? 'active' : 'inactive'}`}>
              {row.original.is_active ? '● Active' : '○ Inactive'}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'dt_created',
        header: 'Created',
        size: 180,
        Cell: ({ cell }) => {
          const value = cell.getValue<string>();
          return <div>{new Date(value).toLocaleString()}</div>;
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 150,
        Cell: ({ row }) => (
          <div>
            <Button
              color="blue"
              size="sm"
              title="Issue token for this endpoint"
              aria-label={`Issue token for ${row.original.endpoint_name}`}
              onClick={() => handleIssueToken(row.original)}
              disabled={loading}
            >
              Issue Token
            </Button>
          </div>
        ),
      },
    ],
    [loading]
  );

  // Mantine React Table instance with standard features
  const table = useMantineReactTable({
    columns,
    data: endpoints,

    // Row Selection
    enableRowSelection: true,

    // Column Features
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableHiding: true,
    enableColumnFilters: true,

    // Sorting & Filtering
    enableSorting: true,
    enableGlobalFilter: true,
    enableFilters: true,

    // Pagination
    enablePagination: true,

    // Table styling
    mantineTableProps: {
      striped: true,
      withColumnBorders: true,
      withTableBorder: true,
    },

    // Toolbar positioning
    positionGlobalFilter: 'left',
    positionToolbarAlertBanner: 'bottom',
    positionActionsColumn: 'last',
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
              action={es.action ? { label: es.action.label, onClick: () => setShowDialog(true) } : undefined}
            />
          );
        })()
      ) : (
        <MantineReactTable table={table} />
      )}

      <Modal
        opened={showDialog}
        onClose={() => setShowDialog(false)}
        title="Register New Endpoint"
        size="lg"
      >
        <div className="endpoint-form">
          <div className="form-field">
            <label>Endpoint Name *</label>
            <TextInput
              value={formData.endpoint_name}
              onChange={(e) => setFormData({ ...formData, endpoint_name: e.target.value })}
              placeholder="e.g., Container Tracking System"
            />
          </div>

          <div className="form-field">
            <label>
              Endpoint URL *
              <HelpTooltip content={helpContent.endpointUrl} dataTestId="endpoint-url-help" />
            </label>
            <TextInput
              value={formData.endpoint_url}
              onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
              placeholder="https://your-system.com/api"
            />
          </div>

          <div className="form-field">
            <label>Description</label>
            <Textarea
              value={formData.endpoint_description}
              onChange={(e) => setFormData({ ...formData, endpoint_description: e.target.value })}
              placeholder="Brief description of this endpoint"
              rows={3}
            />
          </div>

          <div className="form-field">
            <label>Data Category *</label>
            <Select
              data={DATA_CATEGORIES}
              value={formData.data_category}
              onChange={(value) => setFormData({ ...formData, data_category: value || '' })}
            />
          </div>
        </div>

        <Group mt="xl" justify="flex-end">
          <Button onClick={() => setShowDialog(false)} variant="default" aria-label="Cancel endpoint registration">
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
                <label>Token Value:</label>
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
                  <strong>Issued:</strong> {new Date(newToken.issued_at).toLocaleString()}
                </div>
                <div className="token-detail">
                  <strong>Expires:</strong> {new Date(newToken.expires_at).toLocaleString()}
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
