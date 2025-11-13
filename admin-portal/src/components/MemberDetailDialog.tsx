import { Button, Modal, Tabs } from '@mantine/core';
// MemberDetailDialog.tsx - Modal for member details and editing
import type React from 'react';
import { useEffect, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { type LegalEntity, type LegalEntityContact, type Member, api } from '../services/api';
import { getMembershipColor, getStatusColor } from '../utils/colors';
import { safeFormatDate } from '../utils/safeArray';
import type { MemberFormData } from '../utils/validation';
import { CompanyDetails } from './CompanyDetails';
import { CompanyForm } from './CompanyForm';
import { ContactsManager } from './ContactsManager';
import { EndpointManagement } from './EndpointManagement';
import MemberForm from './MemberForm';
import './MemberDetailDialog.css';

interface MemberDetailDialogProps {
  member: Member;
  onClose: () => void;
  onUpdate: (data: MemberFormData) => Promise<void>;
  onIssueToken: (orgId: string) => Promise<void>;
}

const MemberDetailDialog: React.FC<MemberDetailDialogProps> = ({
  member,
  onClose,
  onUpdate,
  onIssueToken,
}) => {
  const [activeTab, setActiveTab] = useState<string | null>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);

  const [legalEntity, setLegalEntity] = useState<LegalEntity | null>(null);
  const [contacts, setContacts] = useState<LegalEntityContact[]>([]);
  const [loading, setLoading] = useState(true);
  const notification = useNotification();

  // Load legal entity and contacts from API
  useEffect(() => {
    loadLegalEntityData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member.legal_entity_id]);

  const loadLegalEntityData = async () => {
    if (!member.legal_entity_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Load legal entity details
      const entityData = await api.getLegalEntity(member.legal_entity_id);
      setLegalEntity(entityData);

      // Load contacts
      const contactsData = await api.getContacts(member.legal_entity_id);
      setContacts(contactsData);
    } catch (error) {
      console.error('Failed to load legal entity data:', error);
      notification.showError('Failed to load company information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: MemberFormData) => {
    await onUpdate(data);
    setIsEditing(false);
  };

  const handleUpdateCompany = async (data: LegalEntity) => {
    if (!legalEntity?.legal_entity_id) {
      notification.showError('No legal entity ID available');
      return;
    }

    try {
      const updated = await api.updateLegalEntity(legalEntity.legal_entity_id, data);
      setLegalEntity(updated);
      setIsEditingCompany(false);
      notification.showSuccess('Company information updated successfully');
    } catch (error) {
      console.error('Failed to update company:', error);
      notification.showError('Failed to update company information');
    }
  };

  const handleContactCreate = async (
    contact: Omit<LegalEntityContact, 'legal_entity_contact_id' | 'dt_created' | 'dt_modified'>
  ): Promise<LegalEntityContact> => {
    try {
      const newContact = await api.createContact(contact);
      setContacts((prev) => [...prev, newContact]);
      notification.showSuccess('Contact created successfully');
      return newContact;
    } catch (error) {
      console.error('Failed to create contact:', error);
      notification.showError('Failed to create contact');
      throw error;
    }
  };

  const handleContactUpdate = async (
    contactId: string,
    data: Partial<LegalEntityContact>
  ): Promise<LegalEntityContact> => {
    try {
      const updated = await api.updateContact(contactId, data);
      setContacts((prev) =>
        prev.map((c) => (c.legal_entity_contact_id === contactId ? updated : c))
      );
      notification.showSuccess('Contact updated successfully');
      return updated;
    } catch (error) {
      console.error('Failed to update contact:', error);
      notification.showError('Failed to update contact');
      throw error;
    }
  };

  const handleContactDelete = async (contactId: string): Promise<void> => {
    try {
      await api.deleteContact(contactId);
      setContacts((prev) => prev.filter((c) => c.legal_entity_contact_id !== contactId));
      notification.showSuccess('Contact deleted successfully');
    } catch (error) {
      console.error('Failed to delete contact:', error);
      notification.showError('Failed to delete contact');
      throw error;
    }
  };

  const handleIssueToken = async () => {
    await onIssueToken(member.org_id);
  };

  const getStatusBadge = (status: string) => {
    return (
      <span
        className="detail-badge"
        style={{ backgroundColor: getStatusColor(status), color: '#ffffff' }}
      >
        {status}
      </span>
    );
  };

  const getMembershipBadge = (level: string) => {
    return (
      <span
        className="detail-badge"
        style={{ backgroundColor: getMembershipColor(level), color: '#ffffff' }}
      >
        {level}
      </span>
    );
  };

  // CR-002: Use safe date formatting with null handling
  const formatDate = (dateString: string | null | undefined) => {
    return safeFormatDate(dateString);
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={`Member Details: ${member.legal_name}`}
      size="xl"
      styles={{ body: { minHeight: '600px' } }}
    >
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="company">Company</Tabs.Tab>
          <Tabs.Tab value="contacts">Contacts</Tabs.Tab>
          <Tabs.Tab value="endpoints">Endpoints</Tabs.Tab>
          <Tabs.Tab value="activity">Activity</Tabs.Tab>
          <Tabs.Tab value="tokens">Tokens</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <div className="detail-content">
            {!isEditing ? (
              <div className="detail-view">
                <div className="detail-section">
                  <h3>Organization Information</h3>
                  <div className="detail-grid">
                    <div className="detail-field">
                      <label>Organization ID</label>
                      <span>{member.org_id}</span>
                    </div>
                    <div className="detail-field">
                      <label>Legal Name</label>
                      <span>{member.legal_name}</span>
                    </div>
                    <div className="detail-field">
                      <label>Domain</label>
                      <span>{member.domain}</span>
                    </div>
                    <div className="detail-field">
                      <label>Status</label>
                      {getStatusBadge(member.status)}
                    </div>
                    <div className="detail-field">
                      <label>Membership Level</label>
                      {getMembershipBadge(member.membership_level)}
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Identifiers</h3>
                  <div className="detail-grid">
                    <div className="detail-field">
                      <label>LEI</label>
                      <span>{member.lei || 'Not provided'}</span>
                    </div>
                    <div className="detail-field">
                      <label>KVK Number</label>
                      <span>{member.kvk || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Timestamps</h3>
                  <div className="detail-grid">
                    <div className="detail-field">
                      <label>Created</label>
                      <span>{formatDate(member.created_at)}</span>
                    </div>
                    {member.updated_at && (
                      <div className="detail-field">
                        <label>Last Updated</label>
                        <span>{formatDate(member.updated_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-actions">
                  <Button color="blue" onClick={() => setIsEditing(true)}>
                    Edit Member
                  </Button>
                  <Button
                    color="green"
                    onClick={handleIssueToken}
                    disabled={member.status !== 'ACTIVE'}
                  >
                    Issue Token
                  </Button>
                </div>
              </div>
            ) : (
              <MemberForm
                initialData={{
                  org_id: member.org_id,
                  legal_name: member.legal_name,
                  domain: member.domain,
                  lei: member.lei || '',
                  kvk: member.kvk || '',
                }}
                onSubmit={handleUpdate}
                onCancel={() => setIsEditing(false)}
              />
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="company" pt="md">
          <div className="detail-content">
            {loading ? (
              <div className="loading-state">Loading company information...</div>
            ) : !legalEntity ? (
              <div className="empty-state">No legal entity information available</div>
            ) : !isEditingCompany ? (
              <CompanyDetails company={legalEntity} onEdit={() => setIsEditingCompany(true)} />
            ) : (
              <CompanyForm
                data={legalEntity}
                onSave={handleUpdateCompany}
                onCancel={() => setIsEditingCompany(false)}
              />
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="contacts" pt="md">
          <div className="detail-content">
            {loading ? (
              <div className="loading-state">Loading contacts...</div>
            ) : !legalEntity?.legal_entity_id ? (
              <div className="empty-state">No legal entity ID available</div>
            ) : (
              <ContactsManager
                legalEntityId={legalEntity.legal_entity_id}
                contacts={contacts}
                onContactCreate={handleContactCreate}
                onContactUpdate={handleContactUpdate}
                onContactDelete={handleContactDelete}
              />
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="endpoints" pt="md">
          <div className="detail-content">
            <EndpointManagement legalEntityId={member.org_id} legalEntityName={member.legal_name} />
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="activity" pt="md">
          <div className="detail-content">
            <div className="activity-timeline">
              <div className="timeline-item">
                <div className="timeline-marker" />
                <div className="timeline-content">
                  <h4>Member Registered</h4>
                  <p>{formatDate(member.created_at)}</p>
                  <span className="timeline-meta">Initial registration</span>
                </div>
              </div>
              {member.updated_at && (
                <div className="timeline-item">
                  <div className="timeline-marker" />
                  <div className="timeline-content">
                    <h4>Last Updated</h4>
                    <p>{formatDate(member.updated_at)}</p>
                    <span className="timeline-meta">Profile information modified</span>
                  </div>
                </div>
              )}
              {member.status === 'ACTIVE' && (
                <div className="timeline-item">
                  <div className="timeline-marker active" />
                  <div className="timeline-content">
                    <h4>Current Status</h4>
                    <p>Active Member</p>
                    <span className="timeline-meta">Full access to services</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="tokens" pt="md">
          <div className="detail-content">
            <div className="tokens-section">
              <h3>Token Management</h3>
              <p>Issue and manage access tokens for this member.</p>
              <div className="token-actions">
                <Button
                  color="blue"
                  onClick={handleIssueToken}
                  disabled={member.status !== 'ACTIVE'}
                >
                  Issue New Token
                </Button>
              </div>
              {member.status !== 'ACTIVE' && (
                <div className="warning-message">
                  ⚠️ Tokens can only be issued for active members
                </div>
              )}
            </div>
          </div>
        </Tabs.Panel>
      </Tabs>

      <Button onClick={onClose} mt="xl" fullWidth>
        Close
      </Button>
    </Modal>
  );
};

export default MemberDetailDialog;
