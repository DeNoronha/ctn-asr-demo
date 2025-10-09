// ContactsManager.tsx - Manage contacts for a legal entity
import React, { useState } from 'react';
import { Grid, GridColumn, GridCellProps } from '@progress/kendo-react-grid';
import { Button } from '@progress/kendo-react-buttons';
import { Dialog } from '@progress/kendo-react-dialogs';
import { Contact } from '../services/api';
import { ContactForm } from './ContactForm';
import './ContactsManager.css';

interface ContactsManagerProps {
  legalEntityId: string;
  contacts: Contact[];
  onUpdate: (contacts: Contact[]) => Promise<void>;
}

export const ContactsManager: React.FC<ContactsManagerProps> = ({
  legalEntityId,
  contacts,
  onUpdate,
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const handleAddContact = () => {
    setEditingContact(null);
    setShowDialog(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setShowDialog(true);
  };

  const handleSaveContact = async (contact: Contact) => {
    let updatedContacts: Contact[];
    
    if (editingContact) {
      // Update existing
      updatedContacts = contacts.map(c =>
        c.legal_entity_contact_id === editingContact.legal_entity_contact_id
          ? contact
          : c
      );
    } else {
      // Add new
      updatedContacts = [...contacts, contact];
    }

    await onUpdate(updatedContacts);
    setShowDialog(false);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      const updatedContacts = contacts.filter(
        c => c.legal_entity_contact_id !== contactId
      );
      await onUpdate(updatedContacts);
    }
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
        <span
          className="contact-type-badge"
          style={{ backgroundColor: color }}
        >
          {type}
        </span>
        {props.dataItem.is_primary && (
          <span className="primary-indicator" title="Primary Contact">★</span>
        )}
      </td>
    );
  };

  const NameCell = (props: GridCellProps) => {
    const fullName = `${props.dataItem.first_name || ''} ${props.dataItem.last_name || ''}`.trim();
    return <td>{fullName || '-'}</td>;
  };

  const ActionsCell = (props: GridCellProps) => {
    return (
      <td>
        <div className="action-buttons">
          <Button
            icon="edit"
            fillMode="flat"
            title="Edit"
            onClick={() => handleEditContact(props.dataItem)}
          />
          <Button
            icon="delete"
            fillMode="flat"
            title="Delete"
            onClick={() => handleDeleteContact(props.dataItem.legal_entity_contact_id)}
          />
        </div>
      </td>
    );
  };

  return (
    <div className="contacts-manager">
      <div className="section-header">
        <h3>Contacts ({contacts.length})</h3>
        <Button themeColor="primary" icon="plus" onClick={handleAddContact}>
          Add Contact
        </Button>
      </div>

      <Grid 
        data={contacts} 
        style={{ height: '400px', maxHeight: '400px' }}
        className="contacts-grid"
      >
        <GridColumn field="contact_type" title="Type" width="140px" cell={ContactTypeCell} />
        <GridColumn field="name" title="Name" width="180px" cell={NameCell} />
        <GridColumn field="email" title="Email" width="220px" />
        <GridColumn field="phone" title="Phone" width="140px" />
        <GridColumn field="job_title" title="Job Title" width="160px" />
        <GridColumn width="100px" title="Actions" cell={ActionsCell} />
      </Grid>

      {contacts.length === 0 && (
        <div className="empty-state">
          <p>No contacts added yet.</p>
          <Button themeColor="primary" onClick={handleAddContact}>
            Add First Contact
          </Button>
        </div>
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
    </div>
  );
};
