/**
 * M2M Clients View - Member Portal
 * Member-scoped M2M client management (members see only their own clients)
 */

import { Button, TextInput, Textarea, Checkbox, Modal, Group } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { Key, Plus, Trash2, Copy, AlertTriangle } from './icons';
import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import { LoadingState } from './shared/LoadingState';

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

interface M2MClientsViewProps {
  legalEntityId: string;
  legalEntityName: string;
  getAccessToken: () => Promise<string>;
  apiBaseUrl: string;
  onNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const AVAILABLE_SCOPES = [
  { value: 'ETA.Read', label: 'ETA.Read - Read ETA updates' },
  { value: 'Container.Read', label: 'Container.Read - Read container status' },
  { value: 'Booking.Read', label: 'Booking.Read - Read bookings' },
  { value: 'Booking.Write', label: 'Booking.Write - Create/update bookings' },
  { value: 'Orchestration.Read', label: 'Orchestration.Read - Access orchestration data' },
];

export const M2MClientsView: React.FC<M2MClientsViewProps> = ({
  legalEntityId,
  legalEntityName,
  getAccessToken,
  apiBaseUrl,
  onNotification,
}) => {
  const [clients, setClients] = useState<M2MClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSecretDialog, setShowSecretDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<M2MClient | null>(null);
  const [generatedSecret, setGeneratedSecret] = useState<string>('');

  const [formData, setFormData] = useState({
    client_name: '',
    description: '',
    scopes: [] as string[],
  });

  useEffect(() => {
    loadClients();
  }, [legalEntityId]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await apiClient.member.getM2MClients(legalEntityId);
      setClients(data);
    } catch (error) {
      console.error('Error loading M2M clients:', error);
      onNotification('Failed to load M2M clients', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    if (!formData.client_name || formData.scopes.length === 0) {
      onNotification('Please provide client name and select at least one scope', 'error');
      return;
    }

    setLoading(true);
    try {
      const newClient = await apiClient.member.createM2MClient(legalEntityId, {
        client_name: formData.client_name,
        description: formData.description,
        assigned_scopes: formData.scopes,
      });

      onNotification('M2M client created successfully', 'success');
      setShowAddDialog(false);
      setFormData({ client_name: '', description: '', scopes: [] });

      // Show secret dialog with the generated secret
      setSelectedClient(newClient.client);
      setGeneratedSecret(newClient.client_secret);
      setShowSecretDialog(true);

      loadClients();
    } catch (error: any) {
      console.error('Error creating M2M client:', error);
      onNotification(error.response?.data?.error || 'Failed to create M2M client', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSecret = async (client: M2MClient) => {
    setLoading(true);
    try {
      const data = await apiClient.member.generateM2MClientSecret(client.m2m_client_id);
      setSelectedClient(client);
      setGeneratedSecret(data.client_secret);
      setShowSecretDialog(true);
      onNotification('New secret generated successfully', 'success');
    } catch (error) {
      console.error('Error generating secret:', error);
      onNotification('Failed to generate secret', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;

    setLoading(true);
    try {
      await apiClient.member.deleteM2MClient(selectedClient.m2m_client_id);
      onNotification('M2M client deactivated successfully', 'success');
      setShowDeleteDialog(false);
      setSelectedClient(null);
      loadClients();
    } catch (error) {
      console.error('Error deleting M2M client:', error);
      onNotification('Failed to deactivate M2M client', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    onNotification('Copied to clipboard', 'success');
  };

  const handleScopeToggle = (scope: string) => {
    setFormData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0 }}>API Clients (M2M Authentication)</h3>
          <p style={{ color: '#666', fontSize: '0.875rem', margin: '8px 0 0 0' }}>
            Manage OAuth 2.0 API clients for secure system-to-system integration
          </p>
        </div>
        <Button color="blue" onClick={() => setShowAddDialog(true)} disabled={loading}>
          <Plus size={16} /> Add M2M Client
        </Button>
      </div>

      <LoadingState loading={loading && clients.length === 0} minHeight={400}>
        {clients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f9fafb', borderRadius: '8px' }}>
            <Key size={48} style={{ color: '#9ca3af' }} />
            <p style={{ fontSize: '1.125rem', fontWeight: 500, margin: '16px 0 8px 0' }}>
              No M2M clients configured
            </p>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Create API clients to allow your systems to access CTN data securely
            </p>
          </div>
        ) : (
          <DataTable
            records={clients}
            columns={[
              {
                accessor: 'client_name',
                title: 'Client Name',
                width: 200,
              },
              {
                accessor: 'azure_client_id',
                title: 'Client ID',
                width: 280,
              },
              {
                accessor: 'assigned_scopes',
                title: 'Scopes',
                width: 300,
                render: (client) => (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {client.assigned_scopes.map((scope: string) => (
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
                ),
              },
              {
                accessor: 'is_active',
                title: 'Status',
                width: 100,
                render: (client) => (
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    backgroundColor: client.is_active ? '#dcfce7' : '#fee2e2',
                    color: client.is_active ? '#166534' : '#991b1b',
                  }}>
                    {client.is_active ? '● Active' : '○ Inactive'}
                  </span>
                ),
              },
              {
                accessor: 'dt_created',
                title: 'Created',
                width: 150,
                render: (client) => formatDate(client.dt_created),
              },
              {
                accessor: 'actions',
                title: 'Actions',
                width: 200,
                render: (client) => (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      size="sm"
                      onClick={() => handleGenerateSecret(client)}
                      disabled={loading || !client.is_active}
                      title="Generate new secret"
                    >
                      <Key size={16} /> New Secret
                    </Button>
                    <Button
                      size="sm"
                      variant="subtle"
                      onClick={() => {
                        setSelectedClient(client);
                        setShowDeleteDialog(true);
                      }}
                      disabled={loading}
                      title="Deactivate client"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ),
              },
            ]}
            minHeight={400}
            fetching={loading}
          />
        )}
      </LoadingState>

      {/* Add M2M Client Dialog */}
      <Modal
        opened={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        title="Add M2M Client"
        size="lg"
      >
        <div style={{ padding: '20px 0' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Client Name *</label>
              <TextInput
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                placeholder="e.g., Container Tracking System"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this client application"
                rows={3}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Assigned Scopes *</label>
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

          <Group justify="flex-end" mt="md">
            <Button onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              color="blue"
              onClick={handleAddClient}
              disabled={!formData.client_name || formData.scopes.length === 0 || loading}
            >
              Create Client
            </Button>
          </Group>
      </Modal>

      {/* Secret Display Dialog */}
      <Modal
        opened={showSecretDialog && !!selectedClient}
        onClose={() => {
          setShowSecretDialog(false);
          setGeneratedSecret('');
          setSelectedClient(null);
        }}
        title="Client Secret Generated"
        size="xl"
      >
        {selectedClient && (
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
                <Button size="sm" onClick={() => copyToClipboard(selectedClient.azure_client_id)}>
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
                <Button size="sm" color="blue" onClick={() => copyToClipboard(generatedSecret)}>
                  <Copy size={14} /> Copy
                </Button>
              </div>
            </div>
          </div>
        )}

        <Group justify="flex-end" mt="md">
          <Button
            color="blue"
            onClick={() => {
              setShowSecretDialog(false);
              setGeneratedSecret('');
              setSelectedClient(null);
            }}
          >
            I've Saved the Secret
          </Button>
        </Group>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal
        opened={showDeleteDialog && !!selectedClient}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedClient(null);
        }}
        title="Deactivate M2M Client"
        size="md"
      >
        {selectedClient && (
          <>
            <div style={{ padding: '20px 0' }}>
              <p>
                Are you sure you want to deactivate <strong>"{selectedClient.client_name}"</strong>?
              </p>
              <p style={{ color: '#dc2626', margin: '12px 0 0 0' }}>
                This will immediately revoke API access for this client.
              </p>
            </div>

            <Group justify="flex-end" mt="md">
              <Button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setSelectedClient(null);
                }}
              >
                Cancel
              </Button>
              <Button color="red" onClick={handleDeleteClient} disabled={loading}>
                Deactivate
              </Button>
            </Group>
          </>
        )}
      </Modal>
    </div>
  );
};
