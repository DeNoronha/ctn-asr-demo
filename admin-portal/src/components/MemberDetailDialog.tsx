import { Button } from '@progress/kendo-react-buttons';
import { Dialog, DialogActionsBar } from '@progress/kendo-react-dialogs';
import { TabStrip, TabStripTab } from '@progress/kendo-react-layout';
// MemberDetailDialog.tsx - Modal for member details and editing
import type React from 'react';
import { useEffect, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { type LegalEntity, type LegalEntityContact, type Member, api } from '../services/api';
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
  const [selected, setSelected] = useState(0);
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

  const handleContactCreate = async (contact: Omit<LegalEntityContact, 'legal_entity_contact_id' | 'dt_created' | 'dt_modified'>): Promise<LegalEntityContact> => {
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

  const handleContactUpdate = async (contactId: string, data: Partial<LegalEntityContact>): Promise<LegalEntityContact> => {
    try {
      const updated = await api.updateContact(contactId, data);
      setContacts((prev) => prev.map((c) => (c.legal_entity_contact_id === contactId ? updated : c)));
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
    const colors: Record<string, string> = {
      ACTIVE: '#10b981',
      PENDING: '#f59e0b',
      SUSPENDED: '#ef4444',
    };
    return (
      <span className="detail-badge" style={{ backgroundColor: colors[status] || '#6b7280' }}>
        {status}
      </span>
    );
  };

  const getMembershipBadge = (level: string) => {
    const colors: Record<string, string> = {
      PREMIUM: '#8b5cf6',
      FULL: '#3b82f6',
      BASIC: '#6b7280',
    };
    return (
      <span className="detail-badge" style={{ backgroundColor: colors[level] || '#9ca3af' }}>
        {level}
      </span>
    );
  };

  // CR-002: Use safe date formatting with null handling
  const formatDate = (dateString: string | null | undefined) => {
    return safeFormatDate(dateString);
  };

  return (
    <Dialog
      title={`Member Details: ${member.legal_name}`}
      onClose={onClose}
      width={1000}
      height={700}
    >
      <TabStrip selected={selected} onSelect={(e) => setSelected(e.selected)}>
        <TabStripTab title="Overview">
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
                  <Button themeColor="primary" onClick={() => setIsEditing(true)}>
                    Edit Member
                  </Button>
                  <Button
                    themeColor="success"
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
        </TabStripTab>

        <TabStripTab title="Company">
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
        </TabStripTab>

        <TabStripTab title="Contacts">
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
        </TabStripTab>

        <TabStripTab title="Endpoints">
          <div className="detail-content">
            <EndpointManagement legalEntityId={member.org_id} legalEntityName={member.legal_name} />
          </div>
        </TabStripTab>

        <TabStripTab title="Activity">
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
        </TabStripTab>

        <TabStripTab title="Tokens">
          <div className="detail-content">
            <div className="tokens-section">
              <h3>Token Management</h3>
              <p>Issue and manage access tokens for this member.</p>
              <div className="token-actions">
                <Button
                  themeColor="primary"
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
        </TabStripTab>
      </TabStrip>

      <DialogActionsBar>
        <Button onClick={onClose}>Close</Button>
      </DialogActionsBar>
    </Dialog>
  );
};

export default MemberDetailDialog;
