import { ActionIcon, Badge, Button, Group, Modal, Select, Stack, TextInput, Tooltip } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/apiClient';
import type { ComponentProps } from '../types';
import { Edit2, FileCheck, Plus, Trash2 } from './icons';
import { LoadingState } from './shared/LoadingState';

interface Identifier {
  legal_entity_reference_id: string;
  identifier_type: string;
  identifier_value: string;
  country_code?: string;
  issuing_authority?: string;
  issued_at?: string;
  expires_at?: string;
  verification_status?: string;
  dt_created: string;
  dt_modified: string;
}

interface IdentifierFormData {
  identifier_type: string;
  identifier_value: string;
  country_code?: string;
}

const IDENTIFIER_TYPES = [
  'KVK',
  'LEI',
  'EORI',
  'VAT',
  'DUNS',
  'EUID',
  'HRB',
  'HRA',
  'KBO',
  'SIREN',
  'SIRET',
  'CRN',
];

const COUNTRIES = [
  { value: 'NL', label: 'Netherlands' },
  { value: 'DE', label: 'Germany' },
  { value: 'BE', label: 'Belgium' },
  { value: 'FR', label: 'France' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
  { value: 'LU', label: 'Luxembourg' },
  { value: 'AT', label: 'Austria' },
  { value: 'IT', label: 'Italy' },
  { value: 'ES', label: 'Spain' },
  { value: 'PT', label: 'Portugal' },
  { value: 'DK', label: 'Denmark' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'PL', label: 'Poland' },
];

export const IdentifiersView: React.FC<ComponentProps> = ({
  memberData,
  onNotification,
  onDataChange,
}) => {
  const [identifiers, setIdentifiers] = useState<Identifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingIdentifier, setEditingIdentifier] = useState<Identifier | null>(null);
  const [identifierToDelete, setIdentifierToDelete] = useState<Identifier | null>(null);

  const [formData, setFormData] = useState<IdentifierFormData>({
    identifier_type: 'KVK',
    country_code: 'NL',
    identifier_value: '',
  });

  useEffect(() => {
    loadIdentifiers();
  }, [memberData.legalEntityId]);

  const loadIdentifiers = async () => {
    if (!memberData.legalEntityId) return;

    setLoading(true);
    try {
      const data = await apiClient.member.getIdentifiers(memberData.legalEntityId);
      setIdentifiers(data || []);
    } catch (error) {
      console.error('Error loading identifiers:', error);
      onNotification('Failed to load identifiers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingIdentifier(null);
    setFormData({
      identifier_type: 'KVK',
      country_code: 'NL',
      identifier_value: '',
    });
    setShowDialog(true);
  };

  const handleEdit = (identifier: Identifier) => {
    setEditingIdentifier(identifier);
    setFormData(identifier);
    setShowDialog(true);
  };

  const handleDeleteClick = (identifier: Identifier) => {
    setIdentifierToDelete(identifier);
    setShowDeleteDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberData.legalEntityId) return;

    try {
      if (editingIdentifier) {
        await apiClient.member.updateIdentifier(
          memberData.legalEntityId,
          editingIdentifier.legal_entity_reference_id,
          {
            identifier_type: formData.identifier_type,
            identifier_value: formData.identifier_value,
            country_code: formData.country_code,
          }
        );
        onNotification('Identifier updated successfully', 'success');
      } else {
        await apiClient.member.createIdentifier(memberData.legalEntityId, {
          identifier_type: formData.identifier_type,
          identifier_value: formData.identifier_value,
          country_code: formData.country_code,
        });
        onNotification('Identifier created successfully', 'success');
      }

      setShowDialog(false);
      loadIdentifiers();
      onDataChange();
    } catch (_error) {
      onNotification('Failed to save identifier', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!identifierToDelete || !memberData.legalEntityId) return;

    setDeleting(true);
    try {
      await apiClient.member.deleteIdentifier(
        memberData.legalEntityId,
        identifierToDelete.legal_entity_reference_id
      );
      onNotification('Identifier deleted successfully', 'success');
      setShowDeleteDialog(false);
      loadIdentifiers();
      onDataChange();
    } catch (error) {
      console.error('Delete identifier error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete identifier';
      onNotification(errorMessage, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessor: 'identifier_type',
        title: 'Type',
        width: 120,
        render: (identifier: Identifier) => (
          <Badge color="blue" variant="light">
            {identifier.identifier_type}
          </Badge>
        ),
      },
      {
        accessor: 'identifier_value',
        title: 'Value',
        width: 200,
        render: (identifier: Identifier) => <strong>{identifier.identifier_value}</strong>,
      },
      {
        accessor: 'country_code',
        title: 'Country',
        width: 100,
        render: (identifier: Identifier) => identifier.country_code || '-',
      },
      {
        accessor: 'verification_status',
        title: 'Status',
        width: 120,
        render: (identifier: Identifier) => {
          const status = identifier.verification_status || 'PENDING';
          const colorMap: Record<string, string> = {
            VALID: 'green',
            INVALID: 'red',
            PENDING: 'yellow',
            EXPIRED: 'gray',
            NOT_VERIFIABLE: 'blue',
            // Legacy values (backward compatibility)
            VALIDATED: 'green',
            VERIFIED: 'green',
            FAILED: 'red',
            DERIVED: 'green',
          };
          return (
            <Badge color={colorMap[status] || 'gray'} variant="light">
              {status}
            </Badge>
          );
        },
      },
      {
        accessor: 'dt_created',
        title: 'Created',
        width: 140,
        render: (identifier: Identifier) => new Date(identifier.dt_created).toLocaleDateString(),
      },
      {
        accessor: 'actions',
        title: 'Actions',
        width: 100,
        render: (identifier: Identifier) => (
          <Group gap={4} wrap="nowrap">
            <Tooltip label="Edit identifier">
              <ActionIcon
                variant="subtle"
                color="blue"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleEdit(identifier);
                }}
              >
                <Edit2 size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Delete identifier">
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleDeleteClick(identifier);
                }}
              >
                <Trash2 size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
    [handleEdit, handleDeleteClick]
  );

  return (
    <div className="identifiers-view">
      <div className="page-header">
        <div>
          <h2>Legal Identifiers</h2>
          <p className="page-subtitle">Manage your organization's legal identification numbers</p>
        </div>
        <Button color="blue" onClick={handleAdd}>
          <Plus size={16} /> Add Identifier
        </Button>
      </div>

      <div className="card">
        <LoadingState loading={loading && identifiers.length === 0} minHeight={300}>
          {identifiers.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: '#f9fafb',
                borderRadius: '8px',
              }}
            >
              <FileCheck size={48} style={{ color: '#9ca3af' }} />
              <p style={{ fontSize: '1.125rem', fontWeight: 500, margin: '16px 0 8px 0' }}>
                No identifiers configured
              </p>
              <p style={{ color: '#6b7280', margin: 0 }}>
                Add legal identifiers like KvK, LEI, EORI numbers for your organization
              </p>
            </div>
          ) : (
            <DataTable
              records={identifiers}
              columns={columns}
              minHeight={400}
              fetching={loading}
            />
          )}
        </LoadingState>
      </div>

      {/* Add/Edit Dialog */}
      <Modal
        opened={showDialog}
        onClose={() => setShowDialog(false)}
        title={editingIdentifier ? 'Edit Identifier' : 'Add Identifier'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Select
              label="Type"
              name="identifier_type"
              value={formData.identifier_type}
              onChange={(value) => setFormData({ ...formData, identifier_type: value || 'KVK' })}
              data={IDENTIFIER_TYPES}
              required
              withAsterisk
            />

            <TextInput
              label="Value"
              name="identifier_value"
              value={formData.identifier_value || ''}
              onChange={(e) => setFormData({ ...formData, identifier_value: e.target.value })}
              required
              withAsterisk
            />

            <Select
              label="Country"
              name="country_code"
              value={formData.country_code}
              onChange={(value) => setFormData({ ...formData, country_code: value || 'NL' })}
              data={COUNTRIES}
              required
              withAsterisk
              searchable
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" color="blue">
                Save Identifier
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal
        opened={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Delete Identifier"
        size="sm"
      >
        <p>
          Are you sure you want to delete the identifier{' '}
          <strong>
            {identifierToDelete?.identifier_type}: {identifierToDelete?.identifier_value}
          </strong>
          ?
        </p>
        <div className="form-actions">
          <Button onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDeleteConfirm} loading={deleting}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};
