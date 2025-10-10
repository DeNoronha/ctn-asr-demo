// MemberDetailDialog.tsx - Modal for member details and editing
import React, { useState, useEffect } from 'react';
import { Dialog, DialogActionsBar } from '@progress/kendo-react-dialogs';
import { Button } from '@progress/kendo-react-buttons';
import { TabStrip, TabStripTab } from '@progress/kendo-react-layout';
import { Member, LegalEntity, LegalEntityContact, api } from '../services/api';
import MemberForm from './MemberForm';
import { EndpointManagement } from './EndpointManagement';
import { CompanyDetails } from './CompanyDetails';
import { CompanyForm } from './CompanyForm';
import { ContactsManager } from './ContactsManager';
import { MemberFormData } from '../utils/validation';
import { useNotification } from '../contexts/NotificationContext';
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
  
  // MOCK DATA - Create default legal entity and contacts
  const mockLegalEntity: LegalEntity = {
    legal_entity_id: member.legal_entity_id || 'mock-entity-id',
    primary_legal_name: member.legal_name,
    address_line1: 'Hoofdstraat 123',
    address_line2: 'Building A',
    postal_code: '1012 AB',
    city: 'Amsterdam',
    province: 'Noord-Holland',
    country_code: 'NL',
    entity_legal_form: 'BV',
    registered_at: member.kvk || '12345678',
    dt_created: member.created_at,
    dt_modified: member.updated_at || member.created_at,
  };

  const mockContacts: LegalEntityContact[] = [
    {
      legal_entity_contact_id: 'contact-1',
      legal_entity_id: mockLegalEntity.legal_entity_id!,
      dt_created: new Date().toISOString(),
      dt_modified: new Date().toISOString(),
      contact_type: 'PRIMARY',
      full_name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+31 20 123 4567',
      mobile: '+31 6 12 34 56 78',
      job_title: 'IT Manager',
      department: 'IT',
      is_primary: true,
    },
    {
      legal_entity_contact_id: 'contact-2',
      legal_entity_id: mockLegalEntity.legal_entity_id!,
      dt_created: new Date().toISOString(),
      dt_modified: new Date().toISOString(),
      contact_type: 'TECHNICAL',
      full_name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+31 20 987 6543',
      job_title: 'Technical Lead',
      department: 'Development',
      is_primary: false,
    },
  ];

  const [legalEntity, setLegalEntity] = useState<LegalEntity>(mockLegalEntity);
  const [contacts, setContacts] = useState<LegalEntityContact[]>(mockContacts);
  const [loading, setLoading] = useState(false);
  const notification = useNotification();

  const handleUpdate = async (data: MemberFormData) => {
    await onUpdate(data);
    setIsEditing(false);
  };

  const handleUpdateCompany = async (data: LegalEntity) => {
    try {
      // TODO: Replace with actual API call when backend is ready
      // const updated = await api.updateLegalEntity(legalEntity.legal_entity_id, data);
      setLegalEntity({ ...legalEntity, ...data, dt_modified: new Date().toISOString() });
      setIsEditingCompany(false);
      notification.showSuccess('Company information updated successfully');
    } catch (error) {
      console.error('Failed to update company:', error);
      notification.showError('Failed to update company information');
    }
  };

  const handleUpdateContacts = async (updatedContacts: LegalEntityContact[]) => {
    try {
      // TODO: Replace with actual API calls when backend is ready
      setContacts(updatedContacts);
      notification.showSuccess('Contacts updated successfully');
    } catch (error) {
      console.error('Failed to update contacts:', error);
      notification.showError('Failed to update contacts');
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
      <span
        className="detail-badge"
        style={{ backgroundColor: colors[status] || '#6b7280' }}
      >
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
      <span
        className="detail-badge"
        style={{ backgroundColor: colors[level] || '#9ca3af' }}
      >
        {level}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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
            {!isEditingCompany ? (
              <CompanyDetails
                company={legalEntity}
                onEdit={() => setIsEditingCompany(true)}
              />
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
            <ContactsManager
              legalEntityId={legalEntity.legal_entity_id!}
              contacts={contacts}
              onUpdate={handleUpdateContacts}
            />
          </div>
        </TabStripTab>

        <TabStripTab title="Endpoints">
          <div className="detail-content">
            <EndpointManagement
              legalEntityId={member.org_id}
              legalEntityName={member.legal_name}
            />
          </div>
        </TabStripTab>

        <TabStripTab title="Activity">
          <div className="detail-content">
            <div className="activity-timeline">
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <h4>Member Registered</h4>
                  <p>{formatDate(member.created_at)}</p>
                  <span className="timeline-meta">Initial registration</span>
                </div>
              </div>
              {member.updated_at && (
                <div className="timeline-item">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <h4>Last Updated</h4>
                    <p>{formatDate(member.updated_at)}</p>
                    <span className="timeline-meta">Profile information modified</span>
                  </div>
                </div>
              )}
              {member.status === 'ACTIVE' && (
                <div className="timeline-item">
                  <div className="timeline-marker active"></div>
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
