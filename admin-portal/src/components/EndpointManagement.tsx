import { Button, TextInput, Textarea, Select } from '@mantine/core';

import { EmptyState } from './EmptyState';
import { Dialog } from '@progress/kendo-react-dialogs';

import { Grid, type GridCellProps, GridColumn } from '@progress/kendo-react-grid';

import { Plus } from './icons';
import type React from 'react';
import { useEffect, useState } from 'react';
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

  const StatusCell = (props: GridCellProps) => {
    return (
      <td>
        <span className={`status-badge ${props.dataItem.is_active ? 'active' : 'inactive'}`}>
          {props.dataItem.is_active ? '● Active' : '○ Inactive'}
        </span>
      </td>
    );
  };

  const ActionsCell = (props: GridCellProps) => {
    return (
      <td>
        <Button
          color="blue"
          size="sm"
          title="Issue token for this endpoint"
          aria-label={`Issue token for ${props.dataItem.endpoint_name}`}
          onClick={() => handleIssueToken(props.dataItem)}
          disabled={loading}
        >
          Issue Token
        </Button>
      </td>
    );
  };

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
        <Grid data={endpoints} style={{ height: '500px' }} navigatable={true}>
          <GridColumn field="endpoint_name" title="Endpoint Name" width="250px" />
          <GridColumn field="endpoint_url" title="URL" width="300px" />
          <GridColumn field="data_category" title="Category" width="150px" />
          <GridColumn field="endpoint_type" title="Type" width="120px" />
          <GridColumn field="is_active" title="Status" width="120px" cells={{ data: StatusCell }} />
          <GridColumn
            field="dt_created"
            title="Created"
            width="180px"
            format="{0:yyyy-MM-dd HH:mm}"
          />
          <GridColumn title="Actions" width="150px" cells={{ data: ActionsCell }} />
        </Grid>
      )}

      {showDialog && (
        <Dialog title="Register New Endpoint" onClose={() => setShowDialog(false)} width={600}>
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
                textField="label"
                dataItemKey="value"
                value={DATA_CATEGORIES.find((c) => c.value === formData.data_category)}
                onChange={(e) => setFormData({ ...formData, data_category: e.target.value.target.value })}
              />
            </div>
          </div>

          <div className="dialog-actions">
            <Button onClick={() => setShowDialog(false)} aria-label="Cancel endpoint registration">
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
          </div>
        </Dialog>
      )}

      {showTokenDialog && newToken && selectedEndpoint && (
        <Dialog
          title="Token Issued Successfully"
          onClose={() => setShowTokenDialog(false)}
          width={700}
        >
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

          <div className="dialog-actions">
            <Button
              color="blue"
              onClick={() => setShowTokenDialog(false)}
              aria-label="Close token dialog"
            >
              Done
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
};
