/**
 * Member Detail View - Full page member details with tabs
 */

import { Button } from '@progress/kendo-react-buttons';
import { TabStrip, TabStripTab } from '@progress/kendo-react-layout';
import { ArrowLeft } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { type LegalEntity, type LegalEntityContact, type Member, api } from '../services/api';
import { CompanyDetails } from './CompanyDetails';
import { CompanyForm } from './CompanyForm';
import { ContactsManager } from './ContactsManager';
import { EndpointManagement } from './EndpointManagement';
import { KvkDocumentUpload } from './KvkDocumentUpload';
import './MemberDetailView.css';

interface MemberDetailViewProps {
  member: Member;
  onBack: () => void;
  onIssueToken: (orgId: string) => Promise<void>;
}

export const MemberDetailView: React.FC<MemberDetailViewProps> = ({
  member,
  onBack,
  onIssueToken,
}) => {
  console.log('Member with legal_entity_id:', member.legal_entity_id);
  const [selected, setSelected] = useState(0);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [legalEntity, setLegalEntity] = useState<LegalEntity | null>(null);
  const [contacts, setContacts] = useState<LegalEntityContact[]>([]);
  const [loading, setLoading] = useState(false);
  const notification = useNotification();

  // Load legal entity and contacts
  useEffect(() => {
    const loadData = async () => {
      if (member.legal_entity_id) {
        setLoading(true);
        try {
          const entity = await api.getLegalEntity(member.legal_entity_id);
          setLegalEntity(entity);

          const entityContacts = await api.getContacts(member.legal_entity_id);
          setContacts(entityContacts);
        } catch (error) {
          console.error('Failed to load legal entity data:', error);
          notification.showError('Failed to load company information');
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [member.legal_entity_id]); // notification is stable from useCallback

  const handleUpdateCompany = async (data: LegalEntity) => {
    if (!legalEntity) return;

    try {
      const updated = await api.updateLegalEntity(legalEntity.legal_entity_id!, data);
      setLegalEntity(updated);
      setIsEditingCompany(false);
      notification.showSuccess('Company information updated successfully');
    } catch (error) {
      console.error('Failed to update company:', error);
      notification.showError('Failed to update company information');
    }
  };

  const handleUpdateContacts = async (updatedContacts: LegalEntityContact[]) => {
    if (!legalEntity) return;

    try {
      setContacts(updatedContacts);
      notification.showSuccess('Contacts updated successfully');
    } catch (error) {
      console.error('Failed to update contacts:', error);
      notification.showError('Failed to update contacts');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: '#10b981',
      PENDING: '#f59e0b',
      SUSPENDED: '#ef4444',
      TERMINATED: '#dc2626',
    };
    return (
      <span className="status-badge" style={{ backgroundColor: colors[status] || '#6b7280' }}>
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
      <span className="membership-badge" style={{ backgroundColor: colors[level] || '#9ca3af' }}>
        {level}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="member-detail-view">
      <div className="detail-header">
        <Button fillMode="flat" onClick={onBack} className="back-button">
          <ArrowLeft size={16} />
          Back to Members
        </Button>
        <div className="header-info">
          <h1>{member.legal_name}</h1>
          <div className="header-badges">
            {getStatusBadge(member.status)}
            {getMembershipBadge(member.membership_level)}
          </div>
        </div>
        <div className="header-actions">
          <Button
            themeColor="primary"
            onClick={() => onIssueToken(member.org_id)}
            disabled={member.status !== 'ACTIVE'}
          >
            Issue Token
          </Button>
        </div>
      </div>

      <TabStrip
        selected={selected}
        onSelect={(e) => setSelected(e.selected)}
        className="detail-tabs"
      >
        <TabStripTab title="Company Details">
          <div className="tab-content">
            {loading ? (
              <div className="loading-state">Loading company information...</div>
            ) : legalEntity ? (
              !isEditingCompany ? (
                <>
                  <CompanyDetails company={legalEntity} onEdit={() => setIsEditingCompany(true)} />
                  <div className="info-section">
                    <h3>Member Information</h3>
                    <div className="info-grid">
                      <div className="info-field">
                        <label>Organization ID</label>
                        <span>{member.org_id}</span>
                      </div>
                      <div className="info-field">
                        <label>Domain</label>
                        <span>{member.domain}</span>
                      </div>
                      <div className="info-field">
                        <label>Status</label>
                        {getStatusBadge(member.status)}
                      </div>
                      <div className="info-field">
                        <label>Membership Level</label>
                        {getMembershipBadge(member.membership_level)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <CompanyForm
                  data={legalEntity}
                  onSave={handleUpdateCompany}
                  onCancel={() => setIsEditingCompany(false)}
                />
              )
            ) : (
              <div className="info-section">
                <h3>Basic Information</h3>
                <div className="info-grid">
                  <div className="info-field">
                    <label>Organization ID</label>
                    <span>{member.org_id}</span>
                  </div>
                  <div className="info-field">
                    <label>Legal Name</label>
                    <span>{member.legal_name}</span>
                  </div>
                  <div className="info-field">
                    <label>Domain</label>
                    <span>{member.domain}</span>
                  </div>
                  <div className="info-field">
                    <label>Status</label>
                    {getStatusBadge(member.status)}
                  </div>
                  <div className="info-field">
                    <label>Membership Level</label>
                    {getMembershipBadge(member.membership_level)}
                  </div>
                </div>
                <p className="empty-message">No company information available</p>
              </div>
            )}
          </div>
        </TabStripTab>

        <TabStripTab title="Identifiers">
          <div className="tab-content">
            <div className="info-section">
              <h3>Legal Identifiers</h3>
              <div className="info-grid">
                <div className="info-field">
                  <label>KvK Number</label>
                  <span className="identifier">{member.kvk || 'Not provided'}</span>
                </div>
                <div className="info-field">
                  <label>LEI</label>
                  <span className="identifier">{member.lei || 'Not provided'}</span>
                </div>
              </div>
            </div>
          </div>
        </TabStripTab>

        <TabStripTab title="Endpoints">
          <div className="tab-content endpoints-tab">
            <EndpointManagement legalEntityId={member.org_id} legalEntityName={member.legal_name} />
          </div>
        </TabStripTab>

        <TabStripTab title="Tokens">
          <div className="tab-content">
            <div className="info-section">
              <h3>Token Management</h3>
              <Button
                themeColor="primary"
                onClick={() => onIssueToken(member.org_id)}
                disabled={member.status !== 'ACTIVE'}
              >
                Issue New Token
              </Button>
            </div>
          </div>
        </TabStripTab>

        <TabStripTab title="Contacts">
          <div className="tab-content">
            {loading ? (
              <div className="loading-state">Loading contacts...</div>
            ) : legalEntity ? (
              <ContactsManager
                legalEntityId={legalEntity.legal_entity_id!}
                contacts={contacts}
                onUpdate={handleUpdateContacts}
              />
            ) : (
              <div className="info-section">
                <h3>Contact Information</h3>
                <p className="empty-message">No company linked to this member</p>
              </div>
            )}
          </div>
        </TabStripTab>

        <TabStripTab title="KvK Verification">
          <div className="tab-content">
            {legalEntity ? (
              <KvkDocumentUpload
                legalEntityId={legalEntity.legal_entity_id!}
                onVerificationComplete={() => {
                  // Reload legal entity data after verification
                  if (member.legal_entity_id) {
                    api.getLegalEntity(member.legal_entity_id).then(setLegalEntity);
                  }
                }}
              />
            ) : (
              <div className="info-section">
                <h3>KvK Document Verification</h3>
                <p className="empty-message">No company linked to this member</p>
              </div>
            )}
          </div>
        </TabStripTab>
      </TabStrip>
    </div>
  );
};
