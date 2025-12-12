import { ActionIcon, Button, Group, Modal, Skeleton, Stack, Tooltip } from '@mantine/core';
import { DataTable, useDataTableColumns } from 'mantine-datatable';
import React, { useState, useCallback } from 'react';
import type { LegalEntityContact } from '../services/api';
import { getContactTypeColor } from '../utils/colors';
import { safeArray, safeLength } from '../utils/safeArray';
import { sanitizeText } from '../utils/sanitize';
import { ConfirmDialog } from './ConfirmDialog';
import { ContactForm } from './ContactForm';
import { EmptyState } from './EmptyState';
import { AlertTriangle, Pencil, Plus, Trash2, Users } from './icons';
import { defaultDataTableProps } from './shared/DataTableConfig';
import './ContactsManager.css';
import { getEmptyState } from '../utils/emptyStates';
import { contactSuccessMessages } from '../utils/successMessages';
import { ErrorBoundary } from './ErrorBoundary';

interface ContactsManagerProps {
  legalEntityId: string;
  contacts: LegalEntityContact[];
  onContactCreate: (
    contact: Omit<LegalEntityContact, 'legal_entity_contact_id' | 'dt_created' | 'dt_modified'>
  ) => Promise<LegalEntityContact>;
  onContactUpdate: (
    contactId: string,
    contact: Partial<LegalEntityContact>
  ) => Promise<LegalEntityContact>;
  onContactDelete: (contactId: string) => Promise<void>;
}

const ContactsManagerComponent: React.FC<ContactsManagerProps> = ({
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

  const handleAddContact = useCallback(() => {
    setEditingContact(null);
    setShowDialog(true);
  }, []);

  const handleEditContact = useCallback((contact: LegalEntityContact) => {
    setEditingContact(contact);
    setShowDialog(true);
  }, []);

  const handleSaveContact = useCallback(
    async (contact: LegalEntityContact) => {
      if (editingContact?.legal_entity_contact_id) {
        // Update existing contact
        const updated = await onContactUpdate(editingContact.legal_entity_contact_id, contact);
        const msg = contactSuccessMessages.updated(updated.full_name || 'Contact');
        const notification = (
          window as unknown as { notification?: { showSuccess: (title: string) => void } }
        ).notification;
        if (msg && notification?.showSuccess) {
          notification.showSuccess(msg.title);
        }
      } else {
        // Create new contact
        const created = await onContactCreate(contact);
        const msg = contactSuccessMessages.created(created.full_name || 'Contact');
        const notification = (
          window as unknown as { notification?: { showSuccess: (title: string) => void } }
        ).notification;
        if (msg && notification?.showSuccess) {
          notification.showSuccess(msg.title);
        }
      }
      setShowDialog(false);
    },
    [editingContact, onContactUpdate, onContactCreate]
  );

  const handleDeleteClick = useCallback((contact: LegalEntityContact) => {
    setContactToDelete(contact);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!contactToDelete?.legal_entity_contact_id) return;
    await onContactDelete(contactToDelete.legal_entity_contact_id);
  }, [contactToDelete, onContactDelete]);

  const handleDialogClose = useCallback(() => {
    setShowDialog(false);
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowDialog(false);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmOpen(false);
  }, []);

  // mantine-datatable column definitions
  const contactTypeLabels: Record<string, string> = {
    AUTHORIZED_REP: 'Authorized Rep',
    TECHNICAL: 'Technical',
    BILLING: 'Billing',
    SUPPORT: 'Support',
    LEGAL: 'Legal',
    OTHER: 'Other',
  };

  const contactTypeTooltips: Record<string, string> = {
    AUTHORIZED_REP: 'Authorized representative (bestuurder/gevolmachtigde) - verified via eHerkenning',
    TECHNICAL: 'Technical contact for system integration and API issues',
    BILLING: 'Billing and invoicing contact',
    SUPPORT: 'Customer support and service desk contact',
    LEGAL: 'Legal contact for contracts and compliance',
    OTHER: 'Other contact type',
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
          const type = contact.contact_type || 'OTHER';
          const label = contactTypeLabels[type] || type;
          return (
            <span
              className="contact-type-badge"
              style={{ backgroundColor: getContactTypeColor(type) }}
              // biome-ignore lint/a11y/useSemanticElements: Inline badge element with styling - semantic equivalent not available
              role="status"
              aria-label={`Contact type: ${label}`}
              title={contactTypeTooltips[type] || `${label} contact`}
            >
              {label}
            </span>
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
          const singleLine = sanitizeText(contact.full_name || '')
            .replace(/\s+/g, ' ')
            .trim();
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
          const singleLine = sanitizeText(String(contact.email || ''))
            .replace(/\s+/g, ' ')
            .trim();
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
          const singleLine = sanitizeText(String(contact.phone || ''))
            .replace(/\s+/g, ' ')
            .trim();
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
          const singleLine = sanitizeText(String(contact.job_title || ''))
            .replace(/\s+/g, ' ')
            .trim();
          return <div>{singleLine}</div>;
        },
      },
      {
        accessor: 'legal_entity_contact_id',
        title: 'Actions',
        width: '0%',
        toggleable: false,
        sortable: false,
        render: (contact) => {
          const contactName = contact?.full_name || 'contact';
          return (
            <Group gap={4} wrap="nowrap">
              <Tooltip label={`Edit ${contactName}`}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleEditContact(contact);
                  }}
                  aria-label={`Edit ${contactName}`}
                >
                  <Pencil size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={`Delete ${contactName}`}>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleDeleteClick(contact);
                  }}
                  aria-label={`Delete ${contactName}`}
                >
                  <Trash2 size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
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
        <ErrorBoundary>
          <DataTable
            {...defaultDataTableProps}
            records={safeContacts}
            columns={effectiveColumns}
            storeColumnsKey="contacts-grid"
          />
        </ErrorBoundary>
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
        onClose={handleDialogClose}
        title={editingContact ? 'Edit Contact' : 'Add Contact'}
        size="lg"
      >
        <ContactForm
          contact={editingContact}
          legalEntityId={legalEntityId}
          onSave={handleSaveContact}
          onCancel={handleCancelForm}
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
        onCancel={handleCancelDelete}
      />
    </div>
  );
};

export const ContactsManager = React.memo(ContactsManagerComponent);
