import { Button, Modal } from '@mantine/core';
import { MantineReactTable, type MRT_ColumnDef, useMantineReactTable } from 'mantine-react-table';
import { AlertTriangle, Pencil, Plus, Trash2, Users } from './icons';
import type React from 'react';
import { useState, useMemo } from 'react';
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

  // Mantine React Table column definitions
  const columns = useMemo<MRT_ColumnDef<LegalEntityContact>[]>(() => {
    const contactTypeTooltips: Record<string, string> = {
      Primary: 'Primary point of contact for this organization',
      Technical: 'Technical contact for system integration and API issues',
      Billing: 'Billing and invoicing contact',
      Support: 'Customer support and service desk contact',
      General: 'General contact for miscellaneous inquiries'
    };

    return [
      {
        accessorKey: 'contact_type',
        header: 'Type',
        size: 140,
        Cell: ({ row }) => {
          const type = row.original.contact_type || 'General';
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
              {row.original.is_primary && (
                <span className="primary-indicator" title="Primary Contact" aria-label="Primary contact">
                  ★
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'full_name',
        header: 'Name',
        size: 180,
        minSize: 120,
        // SEC-007: Sanitize user-generated text fields in grid
        Cell: ({ cell }) => {
          const raw = cell.getValue<string>();
          // Strip any line breaks or <br> that could increase row height
          const singleLine = sanitizeText(raw || '').replace(/\s+/g, ' ').trim();
          return <div>{singleLine}</div>;
        },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        size: 260,
        minSize: 200,
        Cell: ({ cell }) => {
          const value = cell.getValue<string>();
          const singleLine = sanitizeText(String(value || '')).replace(/\s+/g, ' ').trim();
          return <div>{singleLine}</div>;
        },
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        size: 140,
        Cell: ({ cell }) => {
          const value = cell.getValue<string>();
          const singleLine = sanitizeText(String(value || '')).replace(/\s+/g, ' ').trim();
          return <div>{singleLine}</div>;
        },
      },
      {
        accessorKey: 'job_title',
        header: 'Job Title',
        size: 180,
        minSize: 120,
        Cell: ({ cell }) => {
          const value = cell.getValue<string>();
          const singleLine = sanitizeText(String(value || '')).replace(/\s+/g, ' ').trim();
          return <div>{singleLine}</div>;
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 120,
        // CR-002: Add null safety for grid actions
        Cell: ({ row }) => {
          const contactName = row.original?.full_name || 'contact';
          return (
            <div className="action-buttons">
              <Button
                variant="subtle"
                size="sm"
                title="Edit contact"
                aria-label={`Edit ${contactName}`}
                onClick={() => handleEditContact(row.original)}
              >
                <Pencil size={16} />
              </Button>
              <Button
                variant="subtle"
                size="sm"
                title="Delete contact"
                aria-label={`Delete ${contactName}`}
                onClick={() => handleDeleteClick(row.original)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          );
        },
      },
    ];
  }, []);

  // CR-002: Safe array operations
  const safeContacts = safeArray(contacts);
  const contactCount = safeLength(contacts);

  // Mantine React Table instance with standard features
  const table = useMantineReactTable({
    columns,
    data: safeContacts,

    // Row Selection
    enableRowSelection: true,

    // Column Features
    enableColumnResizing: true,
    columnResizeMode: 'onChange', // Shows resize preview while dragging
    enableColumnOrdering: true,
    enableHiding: true,
    enableColumnFilters: true,

    // Sorting & Filtering
    enableSorting: true,
    enableGlobalFilter: true,
    enableFilters: true,

    // Pagination
    enablePagination: true,

    // Table styling
    mantineTableProps: {
      className: 'contacts-grid',
      striped: true,
      withColumnBorders: true,
      withTableBorder: true,
    },

    // Toolbar positioning
    positionGlobalFilter: 'left',
    positionToolbarAlertBanner: 'bottom',
    positionActionsColumn: 'last',
  });

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
        <MantineReactTable table={table} />
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
