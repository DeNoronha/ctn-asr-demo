import { Button, Modal } from '@mantine/core';
import type React from 'react';
import { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import type { ComponentProps, Contact } from '../types';
import { LoadingState } from './shared/LoadingState';

const contactTypes = ['PRIMARY', 'TECHNICAL', 'BILLING', 'SUPPORT', 'LEGAL', 'OTHER'];
const contactMethods = ['EMAIL', 'PHONE', 'MOBILE'];

export const ContactsView: React.FC<ComponentProps> = ({
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
      const data = await apiClient.member.getContacts();
      setContacts(data.contacts || []);
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
      if (editingContact) {
        await apiClient.member.updateContact(
          editingContact.legal_entity_contact_id,
          formData as import('../types').Contact
        );
        onNotification('Contact updated successfully', 'success');
      } else {
        await apiClient.member.createContact(formData as import('../types').Contact);
        onNotification('Contact created successfully', 'success');
      }

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
        <LoadingState loading={loading} minHeight={300}>
          {contacts.length === 0 ? (
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
        </LoadingState>
      </div>

      <Modal
        opened={showDialog}
        onClose={() => setShowDialog(false)}
        title={editingContact ? 'Edit Contact' : 'Add Contact'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="simple-form">
          <div className="form-field">
            <label htmlFor="full_name">Full Name *</label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name || ''}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="first_name">First Name</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name || ''}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label htmlFor="last_name">Last Name</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name || ''}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="phone">Phone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label htmlFor="mobile">Mobile</label>
              <input
                type="tel"
                id="mobile"
                name="mobile"
                value={formData.mobile || ''}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="job_title">Job Title</label>
            <input
              type="text"
              id="job_title"
              name="job_title"
              value={formData.job_title || ''}
              onChange={handleChange}
              className="form-input"
            />
          </div>
          <div className="form-field">
            <label htmlFor="department">Department</label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department || ''}
              onChange={handleChange}
              className="form-input"
            />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="contact_type">Contact Type</label>
              <select
                id="contact_type"
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
              <label htmlFor="preferred_contact_method">Preferred Contact Method</label>
              <select
                id="preferred_contact_method"
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
      </Modal>
    </div>
  );
};
