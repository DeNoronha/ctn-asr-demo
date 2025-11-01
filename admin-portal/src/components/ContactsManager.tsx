import { Button } from '@progress/kendo-react-buttons';
import { Dialog } from '@progress/kendo-react-dialogs';
import { Grid, type GridCellProps, GridColumn } from '@progress/kendo-react-grid';
import { AlertTriangle, Pencil, Plus, Trash2, Users } from './icons';
import type React from 'react';
import { useState } from 'react';
import type { LegalEntityContact } from '../services/api';
import { safeArray, safeLength } from '../utils/safeArray';
import { sanitizeGridCell, sanitizeText } from '../utils/sanitize';
import { getContactTypeColor } from '../utils/colors';
import { ConfirmDialog } from './ConfirmDialog';
import { ContactForm } from './ContactForm';
import { EmptyState } from './EmptyState';
import './ContactsManager.css';
import { getEmptyState } from '../utils/emptyStates';
import { contactSuccessMessages } from '../utils/successMessages';

interface ContactsManagerProps {
  legalEntityId: string;
  contacts: LegalEntityContact[];
  onContactCreate: (contact: Omit<LegalEntityContact, 'legal_entity_contact_id' | 'dt_created' | 'dt_modified'>) => Promise<LegalEntityContact>;
  onContactUpdate: (contactId: string, contact: Partial<LegalEntityContact>) => Promise<LegalEntityContact>;
  onContactDelete: (contactId: string) => Promise<void>;
}

export const ContactsManager: React.FC<ContactsManagerProps> = ({
  legalEntityId,
  contacts,
  onContactCreate,
  onContactUpdate,
  onContactDelete,
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
    if (editingContact && editingContact.legal_entity_contact_id) {
      // Update existing contact
      const updated = await onContactUpdate(editingContact.legal_entity_contact_id, contact);
      const msg = contactSuccessMessages.updated(updated.full_name || 'Contact');
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      msg && (window as any).notification?.showSuccess ? (window as any).notification.showSuccess(msg.title) : null;
    } else {
      // Create new contact
      const created = await onContactCreate(contact);
      const msg = contactSuccessMessages.created(created.full_name || 'Contact');
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      msg && (window as any).notification?.showSuccess ? (window as any).notification.showSuccess(msg.title) : null;
    }
    setShowDialog(false);
  };

  const handleDeleteClick = (contact: LegalEntityContact) => {
    setContactToDelete(contact);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contactToDelete?.legal_entity_contact_id) return;
    await onContactDelete(contactToDelete.legal_entity_contact_id);
  };

  const ContactTypeCell = (props: GridCellProps) => {
    const type = props.dataItem.contact_type || 'General';

    const contactTypeTooltips: Record<string, string> = {
      Primary: 'Primary point of contact for this organization',
      Technical: 'Technical contact for system integration and API issues',
      Billing: 'Billing and invoicing contact',
      Support: 'Customer support and service desk contact',
      General: 'General contact for miscellaneous inquiries'
    };

    return (
      <td>
        <span
          className="contact-type-badge"
          style={{ backgroundColor: getContactTypeColor(type) }}
          role="status"
          aria-label={`Contact type: ${type}`}
          title={contactTypeTooltips[type] || `${type} contact`}
        >
          {type}
        </span>
        {props.dataItem.is_primary && (
          <span className="primary-indicator" title="Primary Contact" aria-label="Primary contact">
            ★
          </span>
        )}
      </td>
    );
  };

  // SEC-007: Sanitize user-generated text fields in grid
  const NameCell = (props: GridCellProps) => {
    const raw = props.dataItem.full_name as string;
    // Strip any line breaks or <br> that could increase row height
    const singleLine = sanitizeText(raw || '').replace(/\s+/g, ' ').trim();
    return <td>{singleLine}</td>;
  };

  const TextCell = (props: GridCellProps) => {
    const value = props.dataItem[props.field || ''];
    const singleLine = sanitizeText(String(value || '')).replace(/\s+/g, ' ').trim();
    return <td>{singleLine}</td>;
  };

  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    // Handle Enter and Space keys for keyboard accessibility (WCAG 2.1 Level AA)
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); // Prevent page scroll on Space
      action();
    }
  };

  // CR-002: Add null safety for grid actions
  const ActionsCell = (props: GridCellProps) => {
    const contactName = props.dataItem?.full_name || 'contact';
    return (
      <td>
        <div className="action-buttons">
          <Button
            fillMode="flat"
            size="small"
            title="Edit contact"
            aria-label={`Edit ${contactName}`}
            onClick={() => handleEditContact(props.dataItem)}
            onKeyDown={(e) => handleKeyDown(e, () => handleEditContact(props.dataItem))}
            tabIndex={0}
          >
            <Pencil size={16} />
          </Button>
          <Button
            fillMode="flat"
            size="small"
            title="Delete contact"
            aria-label={`Delete ${contactName}`}
            onClick={() => handleDeleteClick(props.dataItem)}
            onKeyDown={(e) => handleKeyDown(e, () => handleDeleteClick(props.dataItem))}
            tabIndex={0}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </td>
    );
  };

  // CR-002: Safe array operations
  const safeContacts = safeArray(contacts);
  const contactCount = safeLength(contacts);

  return (
    <div className="contacts-manager">
      <div className="section-header">
        <h3>Contacts ({contactCount})</h3>
        <Button themeColor="primary" onClick={handleAddContact} aria-label="Add new contact">
          <Plus size={16} />
          Add Contact
        </Button>
      </div>

      {contactCount > 0 ? (
        <Grid
          data={safeContacts}
          className="contacts-grid k-grid-sm"
          scrollable="none"
          navigatable={true}
        >
          <GridColumn field="contact_type" title="Type" width="140px" cells={{ data: ContactTypeCell }} />
          <GridColumn
            field="full_name"
            title="Name"
            width="180px"
            cells={{ data: NameCell }}
            minResizableWidth={120}
          />
          <GridColumn field="email" title="Email" width="260px" minResizableWidth={200} cells={{ data: TextCell }} />
          <GridColumn field="phone" title="Phone" width="140px" cells={{ data: TextCell }} />
          <GridColumn field="job_title" title="Job Title" width="180px" minResizableWidth={120} cells={{ data: TextCell }} />
          <GridColumn width="120px" title="Actions" cells={{ data: ActionsCell }} />
        </Grid>
      ) : (
        (() => {
          const es = getEmptyState('contact', 'noContacts');
          return (
            <EmptyState
              icon={<Users size={48} />}
              message={es.message}
              hint={es.hint}
              action={es.action ? { label: es.action.label, onClick: handleAddContact } : undefined}
            />
          );
        })()
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
