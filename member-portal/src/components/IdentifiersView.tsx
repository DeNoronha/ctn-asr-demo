import { ActionIcon, Badge, Button, Group, Modal, Select, Tooltip } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import type React from 'react';
import { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import type { ComponentProps } from '../types';
import { Edit2, FileCheck, Plus, Trash2 } from './icons';
import { LoadingState } from './shared/LoadingState';

interface Identifier {
  legal_entity_reference_id: string;
  identifier_type: string;
  identifier_value: string;
  issuing_authority?: string;
  issued_at?: string;
  expires_at?: string;
  verification_status?: string;
  dt_created: string;
  dt_modified: string;
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
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingIdentifier, setEditingIdentifier] = useState<Identifier | null>(null);
  const [identifierToDelete, setIdentifierToDelete] = useState<Identifier | null>(null);

  const [formData, setFormData] = useState<any>({
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

    try {
      await apiClient.member.deleteIdentifier(
        memberData.legalEntityId,
        identifierToDelete.legal_entity_reference_id
      );
      onNotification('Identifier deleted successfully', 'success');
      setShowDeleteDialog(false);
      loadIdentifiers();
      onDataChange();
    } catch (_error) {
      onNotification('Failed to delete identifier', 'error');
    }
  };

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
              columns={[
                {
                  accessor: 'identifier_type',
                  title: 'Type',
                  width: 120,
                  render: (identifier) => (
                    <Badge color="blue" variant="light">
                      {identifier.identifier_type}
                    </Badge>
                  ),
                },
                {
                  accessor: 'identifier_value',
                  title: 'Value',
                  width: 200,
                  render: (identifier) => <strong>{identifier.identifier_value}</strong>,
                },
                {
                  accessor: 'country_code',
                  title: 'Country',
                  width: 100,
                  render: (identifier: any) => identifier.country_code || '-',
                },
                {
                  accessor: 'verification_status',
                  title: 'Status',
                  width: 120,
                  render: (identifier: any) => (
                    <Badge
                      color={
                        identifier.verification_status === 'VALIDATED'
                          ? 'green'
                          : identifier.verification_status === 'PENDING'
                            ? 'yellow'
                            : 'gray'
                      }
                      variant="light"
                    >
                      {identifier.verification_status || 'PENDING'}
                    </Badge>
                  ),
                },
                {
                  accessor: 'dt_created',
                  title: 'Created',
                  width: 140,
                  render: (identifier) => new Date(identifier.dt_created).toLocaleDateString(),
                },
                {
                  accessor: 'actions',
                  title: 'Actions',
                  width: 100,
                  render: (identifier) => (
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
              ]}
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
        <form onSubmit={handleSubmit} className="simple-form">
          <div className="form-field">
            <label htmlFor="identifier_type">Type *</label>
            <Select
              id="identifier_type"
              name="identifier_type"
              value={formData.identifier_type}
              onChange={(value) => setFormData({ ...formData, identifier_type: value || 'KVK' })}
              data={IDENTIFIER_TYPES}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="identifier_value">Value *</label>
            <input
              type="text"
              id="identifier_value"
              name="identifier_value"
              value={formData.identifier_value || ''}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>
          <div className="form-field">
            <label htmlFor="country_code">Country *</label>
            <Select
              id="country_code"
              name="country_code"
              value={formData.country_code}
              onChange={(value) => setFormData({ ...formData, country_code: value || 'NL' })}
              data={COUNTRIES}
              required
              searchable
            />
          </div>
          <div className="form-actions">
            <Button type="button" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" color="blue">
              Save Identifier
            </Button>
          </div>
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
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button color="red" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};
