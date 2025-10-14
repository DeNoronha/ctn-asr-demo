import { Button } from '@progress/kendo-react-buttons';
import { Dialog } from '@progress/kendo-react-dialogs';
import { Grid, type GridCellProps, GridColumn } from '@progress/kendo-react-grid';
import { Plus, Pencil, Trash2, Users, AlertTriangle } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { LegalEntityContact } from '../services/api';
import { ContactForm } from './ContactForm';
import { EmptyState } from './EmptyState';
import { ConfirmDialog } from './ConfirmDialog';
import './ContactsManager.css';

interface ContactsManagerProps {
  legalEntityId: string;
  contacts: LegalEntityContact[];
  onUpdate: (contacts: LegalEntityContact[]) => Promise<void>;
}

export const ContactsManager: React.FC<ContactsManagerProps> = ({
  legalEntityId,
  contacts,
  onUpdate,
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<LegalEntityContact | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<LegalEntityContact | null>(null);

  const handleAddContact = () => {
    setEditingContact(null);
    setShowDialog(true);
  };

  const handleEditContact = (contact: LegalEntityContact) => {
    setEditingContact(contact);
    setShowDialog(true);
  };

  const handleSaveContact = async (contact: LegalEntityContact) => {
    let updatedContacts: LegalEntityContact[];

    if (editingContact) {
      // Update existing
      updatedContacts = contacts.map((c) =>
        c.legal_entity_contact_id === editingContact.legal_entity_contact_id ? contact : c
      );
    } else {
      // Add new
      updatedContacts = [...contacts, contact];
    }

    await onUpdate(updatedContacts);
    setShowDialog(false);
  };

  const handleDeleteClick = (contact: LegalEntityContact) => {
    setContactToDelete(contact);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return;
    const updatedContacts = contacts.filter(
      (c) => c.legal_entity_contact_id !== contactToDelete.legal_entity_contact_id
    );
    await onUpdate(updatedContacts);
  };

  const ContactTypeCell = (props: GridCellProps) => {
    const types: Record<string, string> = {
      Primary: '#3b82f6',
      Technical: '#8b5cf6',
      Billing: '#f59e0b',
      Support: '#10b981',
    };
    const type = props.dataItem.contact_type || 'General';
    const color = types[type] || '#6b7280';

    return (
      <td>
        <span className="contact-type-badge" style={{ backgroundColor: color }}>
          {type}
        </span>
        {props.dataItem.is_primary && (
          <span className="primary-indicator" title="Primary Contact">
            ★
          </span>
        )}
      </td>
    );
  };

  const NameCell = (props: GridCellProps) => {
    return <td>{props.dataItem.full_name || '-'}</td>;
  };

  const ActionsCell = (props: GridCellProps) => {
    return (
      <td>
        <div className="action-buttons">
          <Button
            fillMode="flat"
            size="small"
            title="Edit contact"
            aria-label={`Edit ${props.dataItem.full_name}`}
            onClick={() => handleEditContact(props.dataItem)}
          >
            <Pencil size={16} />
          </Button>
          <Button
            fillMode="flat"
            size="small"
            title="Delete contact"
            aria-label={`Delete ${props.dataItem.full_name}`}
            onClick={() => handleDeleteClick(props.dataItem)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </td>
    );
  };

  return (
    <div className="contacts-manager">
      <div className="section-header">
        <h3>Contacts ({contacts.length})</h3>
        <Button themeColor="primary" onClick={handleAddContact}>
          <Plus size={16} />
          Add Contact
        </Button>
      </div>

      {contacts.length > 0 ? (
        <Grid
          data={contacts}
          style={{ height: '400px', maxHeight: '400px' }}
          className="contacts-grid"
        >
          <GridColumn field="contact_type" title="Type" width="140px" cell={ContactTypeCell} />
          <GridColumn field="name" title="Name" width="180px" cell={NameCell} minResizableWidth={120} />
          <GridColumn field="email" title="Email" width="260px" minResizableWidth={200} />
          <GridColumn field="phone" title="Phone" width="140px" />
          <GridColumn field="job_title" title="Job Title" width="180px" minResizableWidth={120} />
          <GridColumn width="100px" title="Actions" cell={ActionsCell} />
        </Grid>
      ) : (
        <EmptyState
          icon={<Users size={48} />}
          message="No contacts added yet"
          hint="Add contacts to maintain communication channels with this member"
        />
      )}

      {showDialog && (
        <Dialog
          title={editingContact ? 'Edit Contact' : 'Add Contact'}
          onClose={() => setShowDialog(false)}
          width={600}
        >
          <ContactForm
            contact={editingContact}
            legalEntityId={legalEntityId}
            onSave={handleSaveContact}
            onCancel={() => setShowDialog(false)}
          />
        </Dialog>
      )}

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Delete Contact"
        message={`Are you sure you want to delete ${contactToDelete?.full_name || 'this contact'}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmTheme="error"
        icon={<AlertTriangle size={24} />}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
};
