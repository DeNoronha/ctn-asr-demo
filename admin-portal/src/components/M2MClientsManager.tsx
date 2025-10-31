import { Button } from '@progress/kendo-react-buttons';
import { Dialog, DialogActionsBar } from '@progress/kendo-react-dialogs';
import { Grid, type GridCellProps, GridColumn } from '@progress/kendo-react-grid';
import { Input, TextArea } from '@progress/kendo-react-inputs';
import { Checkbox } from '@progress/kendo-react-inputs';
import { Key, Plus, Trash2, Copy, AlertTriangle } from './icons';
import type React from 'react';
import { useEffect, useState } from 'react';
import { msalInstance } from '../auth/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { formatDate } from '../utils/dateUtils';
import { sanitizeGridCell } from '../utils/sanitize';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { getEmptyState } from '../utils/emptyStates';
import { tokenSuccessMessages } from '../utils/successMessages';
import './IdentifiersManager.css';

interface M2MClient {
  m2m_client_id: string;
  legal_entity_id: string;
  client_name: string;
  azure_client_id: string;
  description: string;
  assigned_scopes: string[];
  is_active: boolean;
  dt_created: string;
}

interface M2MClientsManagerProps {
  legalEntityId: string;
  legalEntityName: string;
}

const AVAILABLE_SCOPES = [
  { value: 'ETA.Read', label: 'ETA.Read - Read ETA updates' },
  { value: 'Container.Read', label: 'Container.Read - Read container status' },
  { value: 'Booking.Read', label: 'Booking.Read - Read bookings' },
  { value: 'Booking.Write', label: 'Booking.Write - Create/update bookings' },
  { value: 'Orchestration.Read', label: 'Orchestration.Read - Access orchestration data' },
];

export const M2MClientsManager: React.FC<M2MClientsManagerProps> = ({
  legalEntityId,
  legalEntityName,
}) => {
  const [clients, setClients] = useState<M2MClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSecretDialog, setShowSecretDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<M2MClient | null>(null);
  const [generatedSecret, setGeneratedSecret] = useState<string>('');
  const notification = useNotification();

  const [formData, setFormData] = useState({
    client_name: '',
    description: '',
    scopes: [] as string[],
  });

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:7071/api/v1';

  const getAccessToken = async (): Promise<string> => {
    const accounts = msalInstance.getAllAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error('No authenticated user');
    }
    const request = {
      scopes: [`api://${import.meta.env.VITE_AZURE_CLIENT_ID}/access_as_user`],
      account: accounts[0],
    };
    const response = await msalInstance.acquireTokenSilent(request);
    return response.accessToken;
  };

  useEffect(() => {
    loadClients();
  }, [legalEntityId]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(`${API_BASE}/legal-entities/${legalEntityId}/m2m-clients`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error loading M2M clients:', error);
      notification.showError('Failed to load M2M clients');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    if (!formData.client_name || formData.scopes.length === 0) {
      notification.showError('Please provide client name and select at least one scope');
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(`${API_BASE}/legal-entities/${legalEntityId}/m2m-clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          client_name: formData.client_name,
          description: formData.description,
          assigned_scopes: formData.scopes,
        }),
      });

      if (response.ok) {
        const newClient = await response.json();
        const msg = tokenSuccessMessages.m2mCreated(newClient?.client?.client_name || formData.client_name);
        notification.showSuccess(msg.title);
        setShowAddDialog(false);
        setFormData({ client_name: '', description: '', scopes: [] });

        // Show secret dialog with the generated secret
        setSelectedClient(newClient.client);
        setGeneratedSecret(newClient.client_secret);
        setShowSecretDialog(true);

        loadClients();
      } else {
        const error = await response.json();
        notification.showError(error.error || 'Failed to create M2M client');
      }
    } catch (error) {
      console.error('Error creating M2M client:', error);
      notification.showError('Failed to create M2M client');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSecret = async (client: M2MClient) => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(
        `${API_BASE}/m2m-clients/${client.m2m_client_id}/generate-secret`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedClient(client);
        setGeneratedSecret(data.client_secret);
        setShowSecretDialog(true);
        notification.showSuccess('New secret generated successfully');
      } else {
        notification.showError('Failed to generate secret');
      }
    } catch (error) {
      console.error('Error generating secret:', error);
      notification.showError('Failed to generate secret');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;

    setLoading(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(`${API_BASE}/m2m-clients/${selectedClient.m2m_client_id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const msg = tokenSuccessMessages.revoked(selectedClient.client_name);
        notification.showSuccess(msg.title);
        setShowDeleteDialog(false);
        setSelectedClient(null);
        loadClients();
      } else {
        notification.showError('Failed to deactivate M2M client');
      }
    } catch (error) {
      console.error('Error deleting M2M client:', error);
      notification.showError('Failed to deactivate M2M client');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    const msg = tokenSuccessMessages.copied();
    notification.showSuccess(msg.title);
  };

  const handleScopeToggle = (scope: string) => {
    setFormData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  // SEC-007: Sanitize user-generated text fields in grid
  const TextCell = (props: GridCellProps) => {
    const { field, dataItem } = props;
    const value = field ? dataItem[field] : '';
    return <td dangerouslySetInnerHTML={{ __html: sanitizeGridCell(value) }} />;
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

  const ScopesCell = (props: GridCellProps) => {
    return (
      <td>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {props.dataItem.assigned_scopes.map((scope: string) => (
            <span
              key={scope}
              style={{
                padding: '2px 8px',
                background: '#e3f2fd',
                borderRadius: '4px',
                fontSize: '0.75rem',
              }}
            >
              {scope}
            </span>
          ))}
        </div>
      </td>
    );
  };

  const ActionsCell = (props: GridCellProps) => {
    return (
      <td>
        <div className="actions-cell">
          <Button
            size="small"
            onClick={() => handleGenerateSecret(props.dataItem)}
            disabled={loading || !props.dataItem.is_active}
            title="Generate new secret"
          >
            <Key size={16} /> New Secret
          </Button>
          <Button
            size="small"
            fillMode="flat"
            onClick={() => {
              setSelectedClient(props.dataItem);
              setShowDeleteDialog(true);
            }}
            disabled={loading}
            title="Deactivate client"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </td>
    );
  };

  return (
    <div className="identifiers-manager">
      <div className="section-header">
        <h3>API Clients (M2M Authentication)</h3>
        <Button themeColor="primary" onClick={() => setShowAddDialog(true)} disabled={loading}>
          <Plus size={16} /> Add M2M Client
        </Button>
      </div>

      {clients.length === 0 ? (
        (() => {
          const es = getEmptyState('token', 'noM2MClients');
          return (
            <EmptyState
              icon={<Key size={48} />}
              message={es.message}
              hint={es.hint}
              action={es.action ? { label: es.action.label, onClick: () => setShowAddDialog(true) } : undefined}
            />
          );
        })()
      ) : (
        <Grid data={clients} style={{ height: '400px' }}>
          <GridColumn field="client_name" title="Client Name" width="200px" cell={TextCell} />
          <GridColumn field="azure_client_id" title="Client ID" width="280px" />
          <GridColumn field="assigned_scopes" title="Scopes" width="300px" cell={ScopesCell} />
          <GridColumn field="is_active" title="Status" width="100px" cell={StatusCell} />
          <GridColumn
            field="dt_created"
            title="Created"
            width="150px"
            cell={(props) => <td>{formatDate(props.dataItem.dt_created)}</td>}
          />
          <GridColumn title="Actions" width="200px" cell={ActionsCell} />
        </Grid>
      )}

      {/* Add M2M Client Dialog */}
      {showAddDialog && (
        <Dialog title="Add M2M Client" onClose={() => setShowAddDialog(false)} width={600}>
          <div className="identifier-form">
            <div className="form-field">
              <label>Client Name *</label>
              <Input
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.value })}
                placeholder="e.g., Container Tracking System"
              />
            </div>

            <div className="form-field">
              <label>Description</label>
              <TextArea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.value })}
                placeholder="Brief description of this client application"
                rows={3}
              />
            </div>

            <div className="form-field">
              <label>Assigned Scopes *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {AVAILABLE_SCOPES.map((scope) => (
                  <label key={scope.value} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Checkbox
                      checked={formData.scopes.includes(scope.value)}
                      onChange={() => handleScopeToggle(scope.value)}
                    />
                    <span>{scope.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogActionsBar>
            <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              themeColor="primary"
              onClick={handleAddClient}
              disabled={!formData.client_name || formData.scopes.length === 0 || loading}
            >
              Create Client
            </Button>
          </DialogActionsBar>
        </Dialog>
      )}

      {/* Secret Display Dialog */}
      {showSecretDialog && selectedClient && (
        <Dialog
          title="Client Secret Generated"
          onClose={() => {
            setShowSecretDialog(false);
            setGeneratedSecret('');
            setSelectedClient(null);
          }}
          width={700}
        >
          <div style={{ padding: '20px 0' }}>
            <div style={{ marginBottom: '20px', padding: '12px', background: '#fff3e0', borderRadius: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <AlertTriangle size={20} />
                <div>
                  <strong>Important: Save this secret now!</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem' }}>
                    This secret will only be shown once. Store it securely - you won't be able to retrieve it again.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong>Client Name:</strong> {selectedClient.client_name}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong>Client ID:</strong>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <code
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                  }}
                >
                  {selectedClient.azure_client_id}
                </code>
                <Button size="small" onClick={() => copyToClipboard(selectedClient.azure_client_id)}>
                  <Copy size={14} /> Copy
                </Button>
              </div>
            </div>

            <div>
              <strong>Client Secret:</strong>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <code
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#fff3e0',
                    border: '2px solid #ff9800',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                  }}
                >
                  {generatedSecret}
                </code>
                <Button size="small" themeColor="primary" onClick={() => copyToClipboard(generatedSecret)}>
                  <Copy size={14} /> Copy
                </Button>
              </div>
            </div>
          </div>

          <DialogActionsBar>
            <Button
              themeColor="primary"
              onClick={() => {
                setShowSecretDialog(false);
                setGeneratedSecret('');
                setSelectedClient(null);
              }}
            >
              I've Saved the Secret
            </Button>
          </DialogActionsBar>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && selectedClient && (
        <ConfirmDialog
          isOpen={showDeleteDialog}
          title="Deactivate M2M Client"
          message={`Are you sure you want to deactivate "${selectedClient.client_name}"? This will revoke API access for this client.`}
          onConfirm={handleDeleteClient}
          onCancel={() => {
            setShowDeleteDialog(false);
            setSelectedClient(null);
          }}
          confirmLabel="Deactivate"
          cancelLabel="Cancel"
          confirmTheme="error"
        />
      )}
    </div>
  );
};
