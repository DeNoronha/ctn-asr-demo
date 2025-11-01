import { Button } from '@mantine/core';

import { Dialog } from '@progress/kendo-react-dialogs';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { ComponentProps, Contact } from '../types';

const contactTypes = ['PRIMARY', 'TECHNICAL', 'BILLING', 'LEGAL', 'OTHER'];
const contactMethods = ['EMAIL', 'PHONE', 'MOBILE'];

export const ContactsView: React.FC<ComponentProps> = ({
  apiBaseUrl,
  getAccessToken,
  onNotification,
  onDataChange,
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const [formData, setFormData] = useState<Partial<Contact>>({});

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(`${apiBaseUrl}/member-contacts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      onNotification('Failed to load contacts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingContact(null);
    setFormData({
      contact_type: 'TECHNICAL',
      full_name: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      mobile: '',
      job_title: '',
      department: '',
      preferred_contact_method: 'EMAIL',
      is_primary: false,
    });
    setShowDialog(true);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData(contact);
    setShowDialog(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getAccessToken();
      const method = editingContact ? 'PUT' : 'POST';
      const url = editingContact
        ? `${apiBaseUrl}/member/contacts/${editingContact.legal_entity_contact_id}`
        : `${apiBaseUrl}/member/contacts`;

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save contact');
      }

      onNotification(
        editingContact ? 'Contact updated successfully' : 'Contact created successfully',
        'success'
      );
      setShowDialog(false);
      loadContacts();
      onDataChange();
    } catch (_error) {
      onNotification('Failed to save contact', 'error');
    }
  };

  return (
    <div className="contacts-view">
      <div className="page-header">
        <div>
          <h2>Contacts</h2>
          <p className="page-subtitle">Manage your organization's contact persons</p>
        </div>
        <Button color="blue" onClick={handleAdd}>
          Add Contact
        </Button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="empty-state">
            <h3>No Contacts</h3>
            <p>Add your first contact to get started.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Job Title</th>
                <th>Type</th>
                <th>Primary</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.legal_entity_contact_id}>
                  <td>{contact.full_name}</td>
                  <td>{contact.email}</td>
                  <td>{contact.phone || '-'}</td>
                  <td>{contact.job_title || '-'}</td>
                  <td>{contact.contact_type}</td>
                  <td>{contact.is_primary ? '✓' : ''}</td>
                  <td>
                    <span className={contact.is_active ? 'status-active' : 'status-inactive'}>
                      {contact.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Button size="sm" onClick={() => handleEdit(contact)}>
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showDialog && (
        <Dialog
          title={editingContact ? 'Edit Contact' : 'Add Contact'}
          onClose={() => setShowDialog(false)}
          width={600}
        >
          <form onSubmit={handleSubmit} className="simple-form">
            <div className="form-field">
              <label>Full Name *</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name || ''}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name || ''}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name || ''}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>
            <div className="form-field">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
              <div className="form-field">
                <label>Mobile</label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile || ''}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </div>
            <div className="form-field">
              <label>Job Title</label>
              <input
                type="text"
                name="job_title"
                value={formData.job_title || ''}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label>Department</label>
              <input
                type="text"
                name="department"
                value={formData.department || ''}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>Contact Type</label>
                <select
                  name="contact_type"
                  value={formData.contact_type || 'TECHNICAL'}
                  onChange={handleChange}
                  className="form-input"
                >
                  {contactTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Preferred Contact Method</label>
                <select
                  name="preferred_contact_method"
                  value={formData.preferred_contact_method || 'EMAIL'}
                  onChange={handleChange}
                  className="form-input"
                >
                  {contactMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <Button type="button" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" color="blue">
                Save Contact
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
};
