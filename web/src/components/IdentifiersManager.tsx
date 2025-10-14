import { Button } from '@progress/kendo-react-buttons';
import { Dialog, DialogActionsBar } from '@progress/kendo-react-dialogs';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Input } from '@progress/kendo-react-inputs';
import { Grid, GridColumn, GridToolbar } from '@progress/kendo-react-grid';
import { Pencil, Plus, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { type LegalEntityIdentifier, apiV2 } from '../services/apiV2';
import './IdentifiersManager.css';

interface IdentifiersManagerProps {
  legalEntityId: string;
  identifiers: LegalEntityIdentifier[];
  onUpdate: (identifiers: LegalEntityIdentifier[]) => void;
}

const IDENTIFIER_TYPES = [
  'LEI', 'KVK', 'EORI', 'VAT', 'DUNS', 'EUID', 'HRB', 'HRA', 'KBO', 'SIREN', 'SIRET', 'CRN', 'OTHER'
];

const VALIDATION_STATUSES = ['PENDING', 'VALIDATED', 'FAILED', 'EXPIRED'];

export const IdentifiersManager: React.FC<IdentifiersManagerProps> = ({
  legalEntityId,
  identifiers,
  onUpdate,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIdentifier, setEditingIdentifier] = useState<LegalEntityIdentifier | null>(null);
  const [formData, setFormData] = useState<Partial<LegalEntityIdentifier>>({
    identifier_type: 'LEI',
    validation_status: 'PENDING',
  });
  const notification = useNotification();

  const handleAdd = () => {
    setEditingIdentifier(null);
    setFormData({
      identifier_type: 'LEI',
      validation_status: 'PENDING',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (identifier: LegalEntityIdentifier) => {
    setEditingIdentifier(identifier);
    setFormData(identifier);
    setIsDialogOpen(true);
  };

  const handleDelete = async (identifier: LegalEntityIdentifier) => {
    if (!window.confirm(`Are you sure you want to delete the ${identifier.identifier_type} identifier?`)) {
      return;
    }

    try {
      if (identifier.legal_entity_reference_id) {
        await apiV2.deleteIdentifier(identifier.legal_entity_reference_id);
      }
      const updated = identifiers.filter(
        (i) => i.legal_entity_reference_id !== identifier.legal_entity_reference_id
      );
      onUpdate(updated);
      notification.showSuccess('Identifier deleted successfully');
    } catch (error) {
      console.error('Failed to delete identifier:', error);
      notification.showError('Failed to delete identifier');
    }
  };

  const handleSave = async () => {
    if (!formData.identifier_type || !formData.identifier_value) {
      notification.showError('Please fill in all required fields');
      return;
    }

    try {
      const now = new Date().toISOString();

      if (editingIdentifier) {
        // Update existing identifier
        const updated = await apiV2.updateIdentifier(
          editingIdentifier.legal_entity_reference_id!,
          {
            ...formData,
            dt_modified: now,
          }
        );
        const updatedList = identifiers.map((i) =>
          i.legal_entity_reference_id === editingIdentifier.legal_entity_reference_id ? updated : i
        );
        onUpdate(updatedList);
        notification.showSuccess('Identifier updated successfully');
      } else {
        // Add new identifier
        const newIdentifier = await apiV2.addIdentifier({
          legal_entity_id: legalEntityId,
          identifier_type: formData.identifier_type as LegalEntityIdentifier['identifier_type'],
          identifier_value: formData.identifier_value!,
          country_code: formData.country_code,
          registry_name: formData.registry_name,
          registry_url: formData.registry_url,
          validation_status: formData.validation_status as LegalEntityIdentifier['validation_status'],
          validation_date: formData.validation_date,
          verification_notes: formData.verification_notes,
        });
        onUpdate([...identifiers, newIdentifier]);
        notification.showSuccess('Identifier added successfully');
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save identifier:', error);
      notification.showError('Failed to save identifier');
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setEditingIdentifier(null);
    setFormData({
      identifier_type: 'LEI',
      validation_status: 'PENDING',
    });
  };

  const getValidationBadge = (status?: string) => {
    if (!status) return null;

    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      VALIDATED: { color: '#10b981', icon: <CheckCircle size={14} /> },
      PENDING: { color: '#f59e0b', icon: <AlertCircle size={14} /> },
      FAILED: { color: '#ef4444', icon: <XCircle size={14} /> },
      EXPIRED: { color: '#6b7280', icon: <XCircle size={14} /> },
    };

    const { color, icon } = config[status] || { color: '#6b7280', icon: null };
    return (
      <span className="validation-badge" style={{ backgroundColor: color }}>
        {icon}
        {status}
      </span>
    );
  };

  const ActionsCell = (props: any) => {
    return (
      <td className="actions-cell">
        <Button
          fillMode="flat"
          size="small"
          title="Edit"
          onClick={() => handleEdit(props.dataItem)}
        >
          <Pencil size={16} />
        </Button>
        <Button
          fillMode="flat"
          size="small"
          title="Delete"
          onClick={() => handleDelete(props.dataItem)}
        >
          <Trash2 size={16} />
        </Button>
      </td>
    );
  };

  const ValidationCell = (props: any) => {
    return (
      <td>
        {getValidationBadge(props.dataItem.validation_status)}
      </td>
    );
  };

  const DateCell = (props: any) => {
    const { field, dataItem } = props;
    const value = dataItem[field];
    return (
      <td>
        {value ? new Date(value).toLocaleDateString('nl-NL', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }) : '-'}
      </td>
    );
  };

  return (
    <div className="identifiers-manager">
      <Grid data={identifiers} style={{ height: '450px' }}>
        <GridToolbar>
          <Button themeColor="primary" onClick={handleAdd}>
            <Plus size={16} />
            Add Identifier
          </Button>
        </GridToolbar>
        <GridColumn field="identifier_type" title="Type" width="100px" />
        <GridColumn field="identifier_value" title="Identifier Value" width="200px" />
        <GridColumn field="country_code" title="Country" width="100px" />
        <GridColumn field="registry_name" title="Registry" width="180px" />
        <GridColumn
          field="validation_status"
          title="Status"
          width="140px"
          cell={ValidationCell}
        />
        <GridColumn
          field="validation_date"
          title="Last Verified"
          width="130px"
          cell={DateCell}
        />
        <GridColumn
          field="dt_modified"
          title="Last Edited"
          width="130px"
          cell={DateCell}
        />
        <GridColumn
          title="Actions"
          width="120px"
          cell={ActionsCell}
          headerClassName="center-header"
        />
      </Grid>

      {identifiers.length === 0 && (
        <div className="empty-state">
          <p>No identifiers registered yet</p>
          <Button themeColor="primary" onClick={handleAdd}>
            <Plus size={16} />
            Add First Identifier
          </Button>
        </div>
      )}

      {isDialogOpen && (
        <Dialog
          title={editingIdentifier ? 'Edit Identifier' : 'Add Identifier'}
          onClose={handleCancel}
          width={600}
        >
          <div className="identifier-form">
            <div className="form-field">
              <label>Identifier Type *</label>
              <DropDownList
                data={IDENTIFIER_TYPES}
                value={formData.identifier_type}
                onChange={(e) => setFormData({ ...formData, identifier_type: e.value })}
              />
            </div>

            <div className="form-field">
              <label>Identifier Value *</label>
              <Input
                value={formData.identifier_value || ''}
                onChange={(e) => setFormData({ ...formData, identifier_value: e.value })}
                placeholder="Enter identifier value"
              />
            </div>

            <div className="form-field">
              <label>Country Code</label>
              <Input
                value={formData.country_code || ''}
                onChange={(e) => setFormData({ ...formData, country_code: e.value })}
                placeholder="e.g., NL, DE, BE"
                maxLength={2}
              />
            </div>

            <div className="form-field">
              <label>Registry Name</label>
              <Input
                value={formData.registry_name || ''}
                onChange={(e) => setFormData({ ...formData, registry_name: e.value })}
                placeholder="e.g., Dutch Chamber of Commerce"
              />
            </div>

            <div className="form-field">
              <label>Registry URL</label>
              <Input
                value={formData.registry_url || ''}
                onChange={(e) => setFormData({ ...formData, registry_url: e.value })}
                placeholder="https://..."
              />
            </div>

            <div className="form-field">
              <label>Validation Status</label>
              <DropDownList
                data={VALIDATION_STATUSES}
                value={formData.validation_status}
                onChange={(e) => setFormData({ ...formData, validation_status: e.value })}
              />
            </div>

            <div className="form-field">
              <label>Verification Notes</label>
              <Input
                value={formData.verification_notes || ''}
                onChange={(e) => setFormData({ ...formData, verification_notes: e.value })}
                placeholder="Any notes about verification"
              />
            </div>
          </div>

          <DialogActionsBar>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button themeColor="primary" onClick={handleSave}>
              {editingIdentifier ? 'Update' : 'Add'}
            </Button>
          </DialogActionsBar>
        </Dialog>
      )}
    </div>
  );
};
