import {
  Alert,
  Button,
  Checkbox,
  Code,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { DataTable, type DataTableColumn, useDataTableColumns } from 'mantine-datatable';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { type M2MClient, apiV2 } from "../services/api";
import { announceToScreenReader } from '../utils/aria';
import { formatDate } from '../utils/dateUtils';
import { getEmptyState } from '../utils/emptyStates';
import { sanitizeGridCell } from '../utils/sanitize';
import { tokenSuccessMessages } from '../utils/successMessages';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { ErrorBoundary } from './ErrorBoundary';
import { AlertTriangle, Copy, Key, Plus, Trash2 } from './icons';
import { defaultDataTableProps, defaultPaginationOptions } from './shared/DataTableConfig';
import './IdentifiersManager.css';

interface M2MClientsManagerProps {
  legalEntityId: string;
  legalEntityName: string;
}

const AVAILABLE_SCOPES = [
  { value: 'ETA.Read', label: 'ETA.Read - Read ETA updates' },
  { value: 'Container.Read', label: 'Container.Read - Read container status' },
  { value: 'Booking.Read', label: 'Booking.Read - Read bookings' },
  { value: 'Booking.Write', label: 'Booking.Write - Create/update bookings' },
];

const M2MClientsManagerComponent: React.FC<M2MClientsManagerProps> = ({ legalEntityId }) => {
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

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiV2.getM2MClients(legalEntityId);
      setClients(data);
    } catch (error) {
      console.error('Error loading M2M clients:', error);
      notification.showError('Failed to load M2M clients');
    } finally {
      setLoading(false);
    }
  }, [legalEntityId, notification]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleAddClient = useCallback(async () => {
    if (!formData.client_name || formData.scopes.length === 0) {
      notification.showError('Please provide client name and select at least one scope');
      return;
    }

    setLoading(true);
    try {
      const newClient = await apiV2.createM2MClient(legalEntityId, {
        client_name: formData.client_name,
        description: formData.description,
        assigned_scopes: formData.scopes,
      });

      const msg = tokenSuccessMessages.m2mCreated(
        newClient?.client?.client_name || formData.client_name
      );
      notification.showSuccess(msg.title);
      setShowAddDialog(false);
      setFormData({ client_name: '', description: '', scopes: [] });

      // Show secret dialog with the generated secret
      setSelectedClient(newClient.client);
      setGeneratedSecret(newClient.client_secret);
      setShowSecretDialog(true);

      loadClients();
    } catch (error) {
      console.error('Error creating M2M client:', error);
      notification.showError('Failed to create M2M client');
    } finally {
      setLoading(false);
    }
  }, [formData, legalEntityId, notification, loadClients]);

  const handleGenerateSecret = useCallback(
    async (client: M2MClient) => {
      setLoading(true);
      try {
        const data = await apiV2.generateM2MClientSecret(client.m2m_client_id);
        setSelectedClient(client);
        setGeneratedSecret(data.client_secret);
        setShowSecretDialog(true);
        notification.showSuccess('New secret generated successfully');
        try {
          announceToScreenReader(
            'Client secret generated. Save this secret now; it will not be shown again.',
            'assertive'
          );
        } catch {}
      } catch (error) {
        console.error('Error generating secret:', error);
        notification.showError('Failed to generate secret');
      } finally {
        setLoading(false);
      }
    },
    [notification]
  );

  const handleDeleteClient = useCallback(async () => {
    if (!selectedClient) return;

    setLoading(true);
    try {
      await apiV2.deleteM2MClient(selectedClient.m2m_client_id);
      const msg = tokenSuccessMessages.revoked(selectedClient.client_name);
      notification.showSuccess(msg.title);
      setShowDeleteDialog(false);
      setSelectedClient(null);
      loadClients();
    } catch (error) {
      console.error('Error deleting M2M client:', error);
      notification.showError('Failed to deactivate M2M client');
    } finally {
      setLoading(false);
    }
  }, [selectedClient, notification, loadClients]);

  const copyToClipboard = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text);
      const msg = tokenSuccessMessages.copied();
      notification.showSuccess(msg.title);
      try {
        announceToScreenReader('Copied to clipboard.');
      } catch {}
    },
    [notification]
  );

  const handleScopeToggle = useCallback((scope: string) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  }, []);

  const handleAddDialogOpen = useCallback(() => {
    setShowAddDialog(true);
  }, []);

  const handleAddDialogClose = useCallback(() => {
    setShowAddDialog(false);
  }, []);

  const handleSecretDialogClose = useCallback(() => {
    setShowSecretDialog(false);
    setGeneratedSecret('');
    setSelectedClient(null);
  }, []);

  const handleDeleteDialogOpen = useCallback((client: M2MClient) => {
    setSelectedClient(client);
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteDialogClose = useCallback(() => {
    setShowDeleteDialog(false);
    setSelectedClient(null);
  }, []);

  const handleClientNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, client_name: e.target.value }));
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, description: e.target.value }));
  }, []);

  const handleConfirmSecret = useCallback(() => {
    setShowSecretDialog(false);
    setGeneratedSecret('');
    setSelectedClient(null);
  }, []);

  // mantine-datatable column definitions
  const { effectiveColumns } = useDataTableColumns<M2MClient>({
    key: 'm2m-clients-grid',
    columns: [
      {
        accessor: 'client_name',
        title: 'Client Name',
        width: 200,
        toggleable: true,
        resizable: true,
        sortable: true,
        // SEC-007: Sanitize user-generated text fields in grid
        render: (record) => <div>{sanitizeGridCell(record.client_name)}</div>,
      },
      {
        accessor: 'azure_client_id',
        title: 'Client ID',
        width: 280,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'assigned_scopes',
        title: 'Scopes',
        width: 300,
        toggleable: true,
        resizable: true,
        render: (record) => (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {record.assigned_scopes.map((scope: string) => (
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
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => (
          <div>
            <span className={`status-badge ${record.is_active ? 'active' : 'inactive'}`}>
              {record.is_active ? '● Active' : '○ Inactive'}
            </span>
          </div>
        ),
      },
      {
        accessor: 'dt_created',
        title: 'Created',
        width: 150,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => <div>{formatDate(record.dt_created)}</div>,
      },
      {
        accessor: 'actions',
        title: 'Actions',
        width: 200,
        toggleable: false,
        render: (record) => (
          <div className="actions-cell">
            <Button
              size="sm"
              onClick={() => handleGenerateSecret(record)}
              disabled={loading || !record.is_active}
              title="Generate new secret"
              aria-label={`Generate new secret for ${record.client_name}`}
            >
              <Key size={16} /> New Secret
            </Button>
            <Button
              size="sm"
              variant="subtle"
              onClick={() => handleDeleteDialogOpen(record)}
              disabled={loading}
              title="Deactivate client"
              aria-label={`Deactivate client ${record.client_name}`}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ),
      },
    ],
  });

  return (
    <div className="identifiers-manager">
      <div className="section-header">
        <h3>API Clients (M2M Authentication)</h3>
        <Button color="blue" onClick={handleAddDialogOpen} disabled={loading}>
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
              action={
                es.action ? { label: es.action.label, onClick: handleAddDialogOpen } : undefined
              }
            />
          );
        })()
      ) : (
        <ErrorBoundary>
          <DataTable
            records={clients}
            columns={effectiveColumns}
            storeColumnsKey="m2m-clients-grid"
            withTableBorder
            withColumnBorders
            striped
            highlightOnHover
          />
        </ErrorBoundary>
      )}

      {/* Add M2M Client Dialog */}
      <Modal opened={showAddDialog} onClose={handleAddDialogClose} title="Add M2M Client" size="lg">
        <div className="identifier-form">
          <div className="form-field">
            <TextInput
              label="Client Name *"
              value={formData.client_name}
              onChange={handleClientNameChange}
              placeholder="e.g., Container Tracking System"
            />
          </div>

          <div className="form-field">
            <Textarea
              label="Description"
              value={formData.description}
              onChange={handleDescriptionChange}
              placeholder="Brief description of this client application"
              rows={3}
            />
          </div>

          <div className="form-field">
            <div style={{ marginBottom: '8px', fontWeight: 500 }}>Assigned Scopes *</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {AVAILABLE_SCOPES.map((scope) => (
                // biome-ignore lint/a11y/noLabelWithoutControl: Label wraps Checkbox component which is valid HTML pattern
                <label
                  key={scope.value}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
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

        <Group mt="xl" justify="flex-end">
          <Button onClick={handleAddDialogClose} variant="default">
            Cancel
          </Button>
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
        onClose={handleSecretDialogClose}
        title="Client Secret Generated"
        size="xl"
      >
        {selectedClient && (
          <Stack gap="lg">
            <Alert
              color="orange"
              icon={<AlertTriangle size={20} />}
              title="Important: Save this secret now!"
            >
              <Text size="sm">
                This secret will only be shown once. Store it securely - you won't be able to
                retrieve it again.
              </Text>
            </Alert>

            <Paper>
              <Text fw={500} mb="xs">
                Client Name:
              </Text>
              <Text>{selectedClient.client_name}</Text>
            </Paper>

            <Paper>
              <Text fw={500} mb="xs">
                Client ID:
              </Text>
              <Group gap="xs" align="flex-start">
                <Code block style={{ flex: 1 }}>
                  {selectedClient.azure_client_id}
                </Code>
                <Button size="sm" onClick={() => copyToClipboard(selectedClient.azure_client_id)}>
                  <Copy size={14} /> Copy
                </Button>
              </Group>
            </Paper>

            <Paper>
              <Text fw={500} mb="xs">
                Client Secret:
              </Text>
              <Group gap="xs" align="flex-start">
                <Code block color="orange" style={{ flex: 1, wordBreak: 'break-all' }}>
                  {generatedSecret}
                </Code>
                <Button size="sm" color="blue" onClick={() => copyToClipboard(generatedSecret)}>
                  <Copy size={14} /> Copy
                </Button>
              </Group>
            </Paper>

            <Group mt="xl" justify="flex-end">
              <Button color="blue" onClick={handleConfirmSecret}>
                I've Saved the Secret
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && selectedClient && (
        <ConfirmDialog
          isOpen={showDeleteDialog}
          title="Deactivate M2M Client"
          message={`Are you sure you want to deactivate "${selectedClient.client_name}"? This will revoke API access for this client.`}
          onConfirm={handleDeleteClient}
          onCancel={handleDeleteDialogClose}
          confirmLabel="Deactivate"
          cancelLabel="Cancel"
          confirmTheme="error"
        />
      )}
    </div>
  );
};

export const M2MClientsManager = React.memo(M2MClientsManagerComponent);
