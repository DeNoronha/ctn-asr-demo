import { ActionIcon, Badge, Button, Group, Modal, Tooltip } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import type React from 'react';
import { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import type { ComponentProps, Contact } from '../types';
import { Edit2, Plus, User } from './icons';
import { LoadingState } from './shared/LoadingState';

const contactTypes = ['PRIMARY', 'TECHNICAL', 'BILLING', 'SUPPORT', 'LEGAL', 'OTHER'];
const contactMethods = ['EMAIL', 'PHONE', 'MOBILE'];

export const ContactsView: React.FC<ComponentProps> = ({ onNotification, onDataChange }) => {
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
        // Transform formData to UpdateContactRequest format
        const updateRequest = {
          email: formData.email,
          full_name: formData.full_name,
          contact_type: formData.contact_type as
            | 'PRIMARY'
            | 'TECHNICAL'
            | 'BILLING'
            | 'SUPPORT'
            | 'LEGAL'
            | 'OTHER'
            | undefined,
          phone: formData.phone,
          mobile: formData.mobile,
          job_title: formData.job_title,
          department: formData.department,
        };
        await apiClient.member.updateContact(editingContact.legal_entity_contact_id, updateRequest);
        onNotification('Contact updated successfully', 'success');
      } else {
        // Transform formData to ContactRequest format (name instead of full_name, type instead of contact_type)
        const createRequest = {
          email: formData.email || '',
          name: formData.full_name || '',
          type: (formData.contact_type || 'OTHER') as
            | 'PRIMARY'
            | 'TECHNICAL'
            | 'BILLING'
            | 'SUPPORT'
            | 'LEGAL'
            | 'OTHER',
          phone: formData.phone,
          mobile: formData.mobile,
          job_title: formData.job_title,
          department: formData.department,
        };
        await apiClient.member.createContact(createRequest);
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
          <Plus size={16} /> Add Contact
        </Button>
      </div>

      <div className="card">
        <LoadingState loading={loading && contacts.length === 0} minHeight={300}>
          {contacts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: '#f9fafb',
                borderRadius: '8px',
              }}
            >
              <User size={48} style={{ color: '#9ca3af' }} />
              <p style={{ fontSize: '1.125rem', fontWeight: 500, margin: '16px 0 8px 0' }}>
                No contacts configured
              </p>
              <p style={{ color: '#6b7280', margin: 0 }}>
                Add contact persons to manage communication with your organization
              </p>
            </div>
          ) : (
            <DataTable
              records={contacts}
              columns={[
                {
                  accessor: 'full_name',
                  title: 'Full Name',
                  width: 200,
                },
                {
                  accessor: 'email',
                  title: 'Email',
                  width: 220,
                },
                {
                  accessor: 'phone',
                  title: 'Phone',
                  width: 140,
                  render: (contact) => contact.phone || '-',
                },
                {
                  accessor: 'job_title',
                  title: 'Job Title',
                  width: 180,
                  render: (contact) => contact.job_title || '-',
                },
                {
                  accessor: 'contact_type',
                  title: 'Type',
                  width: 120,
                  render: (contact) => (
                    <Badge
                      color={
                        contact.contact_type === 'PRIMARY'
                          ? 'blue'
                          : contact.contact_type === 'TECHNICAL'
                            ? 'cyan'
                            : contact.contact_type === 'BILLING'
                              ? 'green'
                              : 'gray'
                      }
                      variant="light"
                    >
                      {contact.contact_type}
                    </Badge>
                  ),
                },
                {
                  accessor: 'is_primary',
                  title: 'Primary',
                  width: 80,
                  render: (contact) =>
                    contact.is_primary ? (
                      <span style={{ color: '#2563eb', fontSize: '1.25rem' }}>✓</span>
                    ) : (
                      <span style={{ color: '#d1d5db' }}>-</span>
                    ),
                },
                {
                  accessor: 'is_active',
                  title: 'Status',
                  width: 100,
                  render: (contact) => (
                    <Badge color={contact.is_active ? 'green' : 'red'} variant="light">
                      {contact.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  ),
                },
                {
                  accessor: 'actions',
                  title: 'Actions',
                  width: 80,
                  render: (contact) => (
                    <Group gap={4} wrap="nowrap">
                      <Tooltip label="Edit contact">
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleEdit(contact);
                          }}
                        >
                          <Edit2 size={16} />
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
