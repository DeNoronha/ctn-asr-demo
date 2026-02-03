import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../services/apiClient';
import type { ComponentProps, Contact } from '../types';
import { Edit2, Plus, User } from './icons';
import { LoadingState } from './shared/LoadingState';

const contactTypes = ['AUTHORIZED_REP', 'TECHNICAL', 'BILLING', 'SUPPORT', 'LEGAL', 'OTHER'];
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingContact) {
        // Transform formData to UpdateContactRequest format
        const updateRequest = {
          email: formData.email,
          full_name: formData.full_name,
          contact_type: formData.contact_type as
            | 'AUTHORIZED_REP'
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
        // Transform formData to ContactRequest format
        const createRequest = {
          email: formData.email || '',
          full_name: formData.full_name || '',
          contact_type: (formData.contact_type || 'OTHER') as
            | 'AUTHORIZED_REP'
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

  const columns = useMemo(
    () => [
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
        render: (contact: Contact) => contact.phone || '-',
      },
      {
        accessor: 'job_title',
        title: 'Job Title',
        width: 180,
        render: (contact: Contact) => contact.job_title || '-',
      },
      {
        accessor: 'contact_type',
        title: 'Type',
        width: 120,
        render: (contact: Contact) => (
          <Badge
            color={
              contact.contact_type === 'AUTHORIZED_REP'
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
        render: (contact: Contact) =>
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
        render: (contact: Contact) => (
          <Badge color={contact.is_active ? 'green' : 'red'} variant="light">
            {contact.is_active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        accessor: 'actions',
        title: 'Actions',
        width: 80,
        render: (contact: Contact) => (
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
    ],
    [handleEdit]
  );

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
            <DataTable records={contacts} columns={columns} minHeight={400} fetching={loading} />
          )}
        </LoadingState>
      </div>

      <Modal
        opened={showDialog}
        onClose={() => setShowDialog(false)}
        title={editingContact ? 'Edit Contact' : 'Add Contact'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Full Name"
              name="full_name"
              value={formData.full_name || ''}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              withAsterisk
            />

            <Group grow>
              <TextInput
                label="First Name"
                name="first_name"
                value={formData.first_name || ''}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
              <TextInput
                label="Last Name"
                name="last_name"
                value={formData.last_name || ''}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </Group>

            <TextInput
              label="Email"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              withAsterisk
            />

            <Group grow>
              <TextInput
                label="Phone"
                name="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <TextInput
                label="Mobile"
                name="mobile"
                type="tel"
                value={formData.mobile || ''}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </Group>

            <TextInput
              label="Job Title"
              name="job_title"
              value={formData.job_title || ''}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
            />

            <TextInput
              label="Department"
              name="department"
              value={formData.department || ''}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />

            <Group grow>
              <Select
                label="Contact Type"
                name="contact_type"
                value={formData.contact_type || 'TECHNICAL'}
                onChange={(value) =>
                  setFormData({ ...formData, contact_type: value || 'TECHNICAL' })
                }
                data={contactTypes}
              />
              <Select
                label="Preferred Contact Method"
                name="preferred_contact_method"
                value={formData.preferred_contact_method || 'EMAIL'}
                onChange={(value) =>
                  setFormData({ ...formData, preferred_contact_method: value || 'EMAIL' })
                }
                data={contactMethods}
              />
            </Group>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" color="blue">
                Save Contact
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </div>
  );
};
