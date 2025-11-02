import { Button, Modal } from '@mantine/core';
import { DataTable, useDataTableColumns } from 'mantine-datatable';
import { AlertTriangle, Pencil, Plus, Trash2, Users } from './icons';
import type React from 'react';
import { useState } from 'react';
import type { LegalEntityContact } from '../services/api';
import { safeArray, safeLength } from '../utils/safeArray';
import { sanitizeText } from '../utils/sanitize';
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

  // mantine-datatable column definitions
  const contactTypeTooltips: Record<string, string> = {
    Primary: 'Primary point of contact for this organization',
    Technical: 'Technical contact for system integration and API issues',
    Billing: 'Billing and invoicing contact',
    Support: 'Customer support and service desk contact',
    General: 'General contact for miscellaneous inquiries'
  };

  const { effectiveColumns } = useDataTableColumns<LegalEntityContact>({
    key: 'contacts-grid',
    columns: [
      {
        accessor: 'contact_type',
        title: 'Type',
        width: 140,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (contact) => {
          const type = contact.contact_type || 'General';
          return (
            <div>
              <span
                className="contact-type-badge"
                style={{ backgroundColor: getContactTypeColor(type) }}
                role="status"
                aria-label={`Contact type: ${type}`}
                title={contactTypeTooltips[type] || `${type} contact`}
              >
                {type}
              </span>
              {contact.is_primary && (
                <span className="primary-indicator" title="Primary Contact" aria-label="Primary contact">
                  ★
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessor: 'full_name',
        title: 'Name',
        width: 180,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (contact) => {
          const singleLine = sanitizeText(contact.full_name || '').replace(/\s+/g, ' ').trim();
          return <div>{singleLine}</div>;
        },
      },
      {
        accessor: 'email',
        title: 'Email',
        width: 260,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (contact) => {
          const singleLine = sanitizeText(String(contact.email || '')).replace(/\s+/g, ' ').trim();
          return <div>{singleLine}</div>;
        },
      },
      {
        accessor: 'phone',
        title: 'Phone',
        width: 140,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (contact) => {
          const singleLine = sanitizeText(String(contact.phone || '')).replace(/\s+/g, ' ').trim();
          return <div>{singleLine}</div>;
        },
      },
      {
        accessor: 'job_title',
        title: 'Job Title',
        width: 180,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (contact) => {
          const singleLine = sanitizeText(String(contact.job_title || '')).replace(/\s+/g, ' ').trim();
          return <div>{singleLine}</div>;
        },
      },
      {
        accessor: 'legal_entity_contact_id',
        title: 'Actions',
        width: 120,
        toggleable: false,
        sortable: false,
        render: (contact) => {
          const contactName = contact?.full_name || 'contact';
          return (
            <div className="action-buttons">
              <Button
                variant="subtle"
                size="sm"
                title="Edit contact"
                aria-label={`Edit ${contactName}`}
                onClick={() => handleEditContact(contact)}
              >
                <Pencil size={16} />
              </Button>
              <Button
                variant="subtle"
                size="sm"
                title="Delete contact"
                aria-label={`Delete ${contactName}`}
                onClick={() => handleDeleteClick(contact)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          );
        },
      },
    ],
  });

  // CR-002: Safe array operations
  const safeContacts = safeArray(contacts);
  const contactCount = safeLength(contacts);

  return (
    <div className="contacts-manager">
      <div className="section-header">
        <h3>Contacts ({contactCount})</h3>
        <Button color="blue" onClick={handleAddContact} aria-label="Add new contact">
          <Plus size={16} />
          Add Contact
        </Button>
      </div>

      {contactCount > 0 ? (
        <DataTable
          withTableBorder
          withColumnBorders
          striped
          highlightOnHover
          records={safeContacts}
          columns={effectiveColumns}
          storeColumnsKey="contacts-grid"
        />
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

      <Modal
        opened={showDialog}
        onClose={() => setShowDialog(false)}
        title={editingContact ? 'Edit Contact' : 'Add Contact'}
        size="lg"
      >
        <ContactForm
          contact={editingContact}
          legalEntityId={legalEntityId}
          onSave={handleSaveContact}
          onCancel={() => setShowDialog(false)}
        />
      </Modal>

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
