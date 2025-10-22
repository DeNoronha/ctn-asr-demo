/**
 * Member Detail View - Full page member details with tabs
 */

import { Button } from '@progress/kendo-react-buttons';
import { Loader } from '@progress/kendo-react-indicators';
import { TabStrip, TabStripTab } from '@progress/kendo-react-layout';
import { ArrowLeft, Plus } from './icons';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { type LegalEntity, type LegalEntityContact, type Member, api } from '../services/api';
import { type LegalEntityEndpoint, type LegalEntityIdentifier, apiV2 } from '../services/apiV2';
import { formatDate } from '../utils/dateUtils';
import { CompanyDetails } from './CompanyDetails';
import { CompanyForm } from './CompanyForm';
import { ContactsManager } from './ContactsManager';
import { EndpointManagement } from './EndpointManagement';
import { IdentifiersManager } from './IdentifiersManager';
import { APIAccessManager } from './APIAccessManager';
import { KvkDocumentUpload } from './KvkDocumentUpload';
import { KvkRegistryDetails } from './KvkRegistryDetails';
import { TokensManager } from './TokensManager';
import './MemberDetailView.css';

interface MemberDetailViewProps {
  member: Member;
  onBack: () => void;
}

export const MemberDetailView: React.FC<MemberDetailViewProps> = ({
  member,
  onBack,
}) => {
  console.log('Member with legal_entity_id:', member.legal_entity_id);
  const [selected, setSelected] = useState(0);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [legalEntity, setLegalEntity] = useState<LegalEntity | null>(null);
  const [contacts, setContacts] = useState<LegalEntityContact[]>([]);
  const [identifiers, setIdentifiers] = useState<LegalEntityIdentifier[]>([]);
  const [endpoints, setEndpoints] = useState<LegalEntityEndpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasKvkRegistryData, setHasKvkRegistryData] = useState(false);
  const notification = useNotification();

  // Load legal entity, contacts, identifiers, and endpoints
  useEffect(() => {
    const loadData = async () => {
      if (member.legal_entity_id) {
        setLoading(true);
        try {
          const entity = await api.getLegalEntity(member.legal_entity_id);
          setLegalEntity(entity);

          const entityContacts = await api.getContacts(member.legal_entity_id);
          setContacts(entityContacts);

          const entityIdentifiers = await apiV2.getIdentifiers(member.legal_entity_id);
          setIdentifiers(entityIdentifiers);

          // Load endpoints using apiV2 (with authentication)
          const entityEndpoints = await apiV2.getEndpoints(member.legal_entity_id);
          setEndpoints(entityEndpoints);

          // Check if KvK registry data exists (for conditional tab display)
          try {
            await apiV2.getKvkRegistryData(member.legal_entity_id);
            setHasKvkRegistryData(true);
          } catch (kvkError: any) {
            // 404 means no data, that's okay
            if (kvkError.response?.status !== 404) {
              console.error('Error checking KvK registry data:', kvkError);
            }
            setHasKvkRegistryData(false);
          }
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

  const handleCreateLegalEntity = async () => {
    if (!member.legal_entity_id) {
      notification.showError('Cannot create legal entity: member has no legal_entity_id');
      return;
    }

    setLoading(true);
    try {
      // Create a new legal entity with the member's information
      const newEntity = await apiV2.createLegalEntity({
        legal_entity_id: member.legal_entity_id,
        primary_legal_name: member.legal_name,
        status: 'ACTIVE',
        domain: member.domain,
      });

      setLegalEntity(newEntity);
      notification.showSuccess(
        'Legal entity created successfully. You can now manage identifiers.'
      );

      // Reload data to ensure consistency
      const entityIdentifiers = await apiV2.getIdentifiers(member.legal_entity_id);
      setIdentifiers(entityIdentifiers);

      const entityContacts = await api.getContacts(member.legal_entity_id);
      setContacts(entityContacts);
    } catch (error: any) {
      console.error('Failed to create legal entity:', error);
      notification.showError(
        `Failed to create legal entity: ${error.response?.data?.error || error.message || 'Unknown error'}`
      );
    } finally {
      setLoading(false);
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

  return (
    <div className="member-detail-view">
      <div className="detail-header">
        <Button themeColor="secondary" onClick={onBack} className="back-button">
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
      </div>

      <TabStrip
        selected={selected}
        onSelect={(e) => setSelected(e.selected)}
        className="detail-tabs"
      >
        <TabStripTab title="Company Details">
          <div className="tab-content">
            {loading ? (
              <div className="loading-state">
                <Loader size="medium" />
                <span>Loading company information...</span>
              </div>
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
            {loading ? (
              <div className="loading-state">
                <Loader size="medium" />
                <span>Loading identifiers...</span>
              </div>
            ) : legalEntity ? (
              <IdentifiersManager
                legalEntityId={member.legal_entity_id!}
                identifiers={identifiers}
                onUpdate={setIdentifiers}
              />
            ) : member.legal_entity_id ? (
              <div className="info-section" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <h3>Legal Identifiers</h3>
                <p className="empty-message" style={{ marginBottom: '20px' }}>
                  No legal entity record found for this member
                </p>
                <p
                  style={{
                    color: '#6b7280',
                    marginBottom: '30px',
                    maxWidth: '600px',
                    margin: '0 auto 30px',
                  }}
                >
                  A legal entity is required to manage business identifiers like KVK, LEI, EORI, and
                  VAT numbers. You can create one now using this member's information.
                </p>
                <Button themeColor="primary" onClick={handleCreateLegalEntity} disabled={loading}>
                  <Plus size={16} />
                  Create Legal Entity
                </Button>
              </div>
            ) : (
              <div className="info-section" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <h3>Legal Identifiers</h3>
                <p className="empty-message" style={{ color: '#dc2626', marginBottom: '20px' }}>
                  This member has no legal entity ID configured
                </p>
                <p style={{ color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>
                  Please contact your system administrator to link a legal entity to this member
                  before managing identifiers.
                </p>
              </div>
            )}
          </div>
        </TabStripTab>

        <TabStripTab title="System Integrations">
          <div className="tab-content endpoints-tab">
            <div style={{ marginBottom: '16px' }}>
              <h3>System Integrations</h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '8px 0 0 0', maxWidth: '800px' }}>
                Register your organization's system endpoints where CTN can send notifications, webhooks, and event updates.
                These are <strong>outbound integrations</strong> from CTN to your systems.
              </p>
            </div>
            <EndpointManagement legalEntityId={member.org_id} legalEntityName={member.legal_name} />
          </div>
        </TabStripTab>

        <TabStripTab title="API Access">
          <div className="tab-content">
            {legalEntity ? (
              <APIAccessManager
                legalEntityId={legalEntity.legal_entity_id!}
                legalEntityName={legalEntity.primary_legal_name || member.legal_name}
              />
            ) : (
              <div className="info-section">
                <h3>API Access</h3>
                <p className="empty-message">No company linked to this member</p>
              </div>
            )}
          </div>
        </TabStripTab>

        <TabStripTab title="Contacts">
          <div className="tab-content">
            {loading ? (
              <div className="loading-state">
                <Loader size="medium" />
                <span>Loading contacts...</span>
              </div>
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

        <TabStripTab title="Document Verification">
          <div className="tab-content">
            {legalEntity ? (
              <KvkDocumentUpload
                legalEntityId={legalEntity.legal_entity_id!}
                onVerificationComplete={() => {
                  // Reload legal entity data after verification
                  if (member.legal_entity_id) {
                    api.getLegalEntity(member.legal_entity_id).then(setLegalEntity);
                    // Refresh KvK registry data check
                    apiV2
                      .getKvkRegistryData(member.legal_entity_id)
                      .then(() => setHasKvkRegistryData(true))
                      .catch(() => setHasKvkRegistryData(false));
                  }
                }}
              />
            ) : (
              <div className="info-section">
                <h3>Document Verification</h3>
                <p className="empty-message">No company linked to this member</p>
              </div>
            )}
          </div>
        </TabStripTab>

        {hasKvkRegistryData && (
          <TabStripTab title="KvK Registry">
            <div className="tab-content">
              {legalEntity ? (
                <KvkRegistryDetails legalEntityId={legalEntity.legal_entity_id!} />
              ) : (
                <div className="info-section">
                  <h3>KvK Registry Data</h3>
                  <p className="empty-message">No company linked to this member</p>
                </div>
              )}
            </div>
          </TabStripTab>
        )}
      </TabStrip>
    </div>
  );
};
