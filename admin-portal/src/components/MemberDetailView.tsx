/**
 * Member Detail View - Full page member details with tabs
 */

import { Button, Tabs } from '@mantine/core';
import type React from 'react';
import { useEffect, useState } from 'react';
import { RoleGuard } from '../auth/ProtectedRoute';
import { UserRole } from '../auth/authConfig';
import { useNotification } from '../contexts/NotificationContext';
import { useApiError } from '../hooks/useApiError';
import { type LegalEntity, type LegalEntityContact, type Member, api } from '../services/api';
import { type LegalEntityEndpoint, type LegalEntityIdentifier, apiV2 } from '../services/apiV2';
import { getMembershipColor, getStatusColor } from '../utils/colors';
import { formatDate } from '../utils/dateUtils';
import { getEmptyState } from '../utils/emptyStates';
import { logger } from '../utils/logger';
import { APIAccessManager } from './APIAccessManager';
import { CompanyDetails } from './CompanyDetails';
import { CompanyForm } from './CompanyForm';
import { ContactsManager } from './ContactsManager';
import { EmptyState } from './EmptyState';
import { EndpointManagement } from './EndpointManagement';
import { IdentifiersManager } from './IdentifiersManager';
import { KvkDocumentUpload } from './KvkDocumentUpload';
import { KvkRegistryDetails } from './KvkRegistryDetails';
import { TierManagement } from './TierManagement';
import { ArrowLeft, Plus } from './icons';
import { LoadingState } from './shared/LoadingState';
import './MemberDetailView.css';

interface MemberDetailViewProps {
  member: Member;
  onBack: () => void;
}

export const MemberDetailView: React.FC<MemberDetailViewProps> = ({ member, onBack }) => {
  logger.log('Member with legal_entity_id:', member.legal_entity_id);
  const [selected, setSelected] = useState<string | null>('company-details');
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [legalEntity, setLegalEntity] = useState<LegalEntity | null>(null);
  const [contacts, setContacts] = useState<LegalEntityContact[]>([]);
  const [identifiers, setIdentifiers] = useState<LegalEntityIdentifier[]>([]);
  const [endpoints, setEndpoints] = useState<LegalEntityEndpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasKvkRegistryData, setHasKvkRegistryData] = useState(false);
  const notification = useNotification();
  const { handleError } = useApiError();

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
          try {
            const entityEndpoints = await apiV2.getEndpoints(member.legal_entity_id);
            setEndpoints(entityEndpoints);
          } catch (endpointError: unknown) {
            logger.error('Failed to load endpoints:', endpointError);
            // Don't block loading other data if endpoints fail
            setEndpoints([]);
          }

          // Check if KvK registry data exists (for conditional tab display)
          try {
            await apiV2.getKvkRegistryData(member.legal_entity_id);
            setHasKvkRegistryData(true);
          } catch (kvkError: unknown) {
            // 404 means no data, that's okay
            if (kvkError && typeof kvkError === 'object' && 'response' in kvkError) {
              const axiosError = kvkError as { response?: { status: number } };
              if (axiosError.response?.status !== 404) {
                logger.error('Error checking KvK registry data:', kvkError);
              }
            }
            setHasKvkRegistryData(false);
          }
        } catch (error) {
          logger.error('Failed to load legal entity data:', error);
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
      logger.error('Failed to update company:', error);
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
      logger.error('Failed to create contact:', error);
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
      logger.error('Failed to update contact:', error);
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
      logger.error('Failed to delete contact:', error);
      notification.showError('Failed to delete contact');
      throw error;
    }
  };

  const handleIdentifierCreate = async (
    identifier: Omit<
      LegalEntityIdentifier,
      'legal_entity_reference_id' | 'dt_created' | 'dt_modified'
    >
  ): Promise<LegalEntityIdentifier> => {
    try {
      const newIdentifier = await apiV2.addIdentifier(identifier);
      // Refetch all identifiers to get fresh data (including auto-generated EUID)
      const refreshedIdentifiers = await apiV2.getIdentifiers(member.legal_entity_id!);
      setIdentifiers(refreshedIdentifiers);

      // Check if EUID was auto-generated
      const euidAutoGenerated = (newIdentifier as any).euid_auto_generated === true;
      if (euidAutoGenerated) {
        notification.showSuccess(
          `${identifier.identifier_type} added successfully. EUID automatically generated and added.`
        );
      } else {
        notification.showSuccess('Identifier added successfully');
      }
      return newIdentifier;
    } catch (error) {
      logger.error('Failed to create identifier:', error);
      notification.showError('Failed to create identifier');
      throw error;
    }
  };

  const handleIdentifierUpdate = async (
    identifierId: string,
    data: Partial<LegalEntityIdentifier>
  ): Promise<LegalEntityIdentifier> => {
    try {
      const updated = await apiV2.updateIdentifier(identifierId, data);
      // Refetch all identifiers to get fresh data (including auto-updated EUID)
      const refreshedIdentifiers = await apiV2.getIdentifiers(member.legal_entity_id!);
      setIdentifiers(refreshedIdentifiers);

      // Check if EUID was auto-updated
      const euidAutoUpdated = (updated as any).euid_auto_updated === true;
      if (euidAutoUpdated) {
        notification.showSuccess(
          'Identifier updated successfully. EUID automatically synchronized.'
        );
      } else {
        notification.showSuccess('Identifier updated successfully');
      }
      return updated;
    } catch (error) {
      logger.error('Failed to update identifier:', error);
      notification.showError('Failed to update identifier');
      throw error;
    }
  };

  const handleIdentifierDelete = async (identifierId: string): Promise<void> => {
    try {
      await apiV2.deleteIdentifier(identifierId);
      setIdentifiers((prev) => prev.filter((i) => i.legal_entity_reference_id !== identifierId));
      notification.showSuccess('Identifier deleted successfully');
    } catch (error) {
      logger.error('Failed to delete identifier:', error);
      notification.showError('Failed to delete identifier');
      throw error;
    }
  };

  const handleRefreshIdentifiers = async (): Promise<void> => {
    try {
      const refreshedIdentifiers = await apiV2.getIdentifiers(member.legal_entity_id!);
      setIdentifiers(refreshedIdentifiers);
    } catch (error) {
      logger.error('Failed to refresh identifiers:', error);
      throw error;
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
    } catch (error: unknown) {
      handleError(error, 'creating legal entity');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMember = async () => {
    setLoading(true);
    try {
      await apiV2.updateMemberStatus(member.org_id, 'ACTIVE', 'Approved by admin');
      notification.showSuccess('Member activated successfully');
      // Reload page to show updated status
      window.location.reload();
    } catch (error: unknown) {
      handleError(error, 'activating member');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <span className="status-badge" style={{ backgroundColor: getStatusColor(status) }}>
        {status}
      </span>
    );
  };

  const getMembershipBadge = (level: string) => {
    return (
      <span className="membership-badge" style={{ backgroundColor: getMembershipColor(level) }}>
        {level}
      </span>
    );
  };

  return (
    <div className="member-detail-view">
      <div className="detail-header">
        <Button color="gray" onClick={onBack} className="back-button">
          <ArrowLeft size={16} />
          Back to Members
        </Button>
        <div className="header-info">
          <h1>{member.legal_name}</h1>
          <div className="header-badges">
            {getStatusBadge(member.status)}
            {getMembershipBadge(member.membership_level)}
            {member.status?.toUpperCase() === 'PENDING' && (
              <RoleGuard allowedRoles={[UserRole.ASSOCIATION_ADMIN, UserRole.SYSTEM_ADMIN]}>
                <Button
                  color="green"
                  onClick={handleApproveMember}
                  disabled={loading}
                  style={{ marginLeft: '12px' }}
                  aria-label="Activate member"
                >
                  Activate Member
                </Button>
              </RoleGuard>
            )}
          </div>
        </div>
      </div>

      <Tabs value={selected} onChange={setSelected} className="detail-tabs">
        <Tabs.List>
          <Tabs.Tab value="company-details">Company Details</Tabs.Tab>
          <Tabs.Tab value="identifiers">Identifiers</Tabs.Tab>
          <Tabs.Tab value="system-integrations">System Integrations</Tabs.Tab>
          <Tabs.Tab value="api-access">API Access</Tabs.Tab>
          <Tabs.Tab value="contacts">Contacts</Tabs.Tab>
          <Tabs.Tab value="document-verification">Document Verification</Tabs.Tab>
          <Tabs.Tab value="authentication-tier">Authentication Tier</Tabs.Tab>
          {hasKvkRegistryData && <Tabs.Tab value="kvk-registry">KvK Registry</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="company-details" pt="md">
          <div className="tab-content">
            <LoadingState loading={loading} minHeight={300}>
              {legalEntity ? (
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
                  {(() => {
                    const es = getEmptyState('generic', 'noData');
                    return <EmptyState message={es.message} hint={es.hint} />;
                  })()}
                </div>
              )}
            </LoadingState>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="identifiers" pt="md">
          <div className="tab-content">
            <LoadingState loading={loading} minHeight={300}>
              {legalEntity ? (
                <IdentifiersManager
                  legalEntityId={member.legal_entity_id!}
                  identifiers={identifiers}
                  onIdentifierCreate={handleIdentifierCreate}
                  onIdentifierUpdate={handleIdentifierUpdate}
                  onIdentifierDelete={handleIdentifierDelete}
                  onRefresh={handleRefreshIdentifiers}
                />
              ) : member.legal_entity_id ? (
                (() => {
                  const es = getEmptyState('identifier', 'noIdentifiers');
                  return (
                    <div
                      className="info-section"
                      style={{ textAlign: 'center', padding: '40px 20px' }}
                    >
                      <h3>Legal Identifiers</h3>
                      <EmptyState
                        message={es.message}
                        hint={es.hint}
                        action={{ label: 'Create Legal Entity', onClick: handleCreateLegalEntity }}
                      />
                    </div>
                  );
                })()
              ) : (
                (() => {
                  const es = getEmptyState('generic', 'noData');
                  return (
                    <div
                      className="info-section"
                      style={{ textAlign: 'center', padding: '40px 20px' }}
                    >
                      <h3>Legal Identifiers</h3>
                      <EmptyState message={es.message} hint={es.hint} />
                    </div>
                  );
                })()
              )}
            </LoadingState>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="system-integrations" pt="md">
          <div className="tab-content endpoints-tab">
            <div style={{ marginBottom: '16px' }}>
              <h3>System Integrations</h3>
              <p
                style={{
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  margin: '8px 0 0 0',
                  maxWidth: '800px',
                }}
              >
                Register your organization's system endpoints where CTN can send notifications,
                webhooks, and event updates. These are <strong>outbound integrations</strong> from
                CTN to your systems.
              </p>
            </div>
            {member.legal_entity_id ? (
              <EndpointManagement
                legalEntityId={member.legal_entity_id}
                legalEntityName={member.legal_name}
              />
            ) : (
              <EmptyState
                message="No legal entity associated with this member"
                hint="A legal entity must be linked before endpoints can be managed."
              />
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="api-access" pt="md">
          <div className="tab-content">
            {legalEntity ? (
              <APIAccessManager
                legalEntityId={legalEntity.legal_entity_id!}
                legalEntityName={legalEntity.primary_legal_name || member.legal_name}
              />
            ) : (
              (() => {
                const es = getEmptyState('generic', 'noData');
                return (
                  <div className="info-section">
                    <h3>API Access</h3>
                    <EmptyState message={es.message} hint={es.hint} />
                  </div>
                );
              })()
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="contacts" pt="md">
          <div className="tab-content">
            <LoadingState loading={loading} minHeight={300}>
              {legalEntity ? (
                <ContactsManager
                  legalEntityId={legalEntity.legal_entity_id!}
                  contacts={contacts}
                  onContactCreate={handleContactCreate}
                  onContactUpdate={handleContactUpdate}
                  onContactDelete={handleContactDelete}
                />
              ) : (
                (() => {
                  const es = getEmptyState('contact', 'noContacts');
                  return (
                    <div className="info-section">
                      <h3>Contact Information</h3>
                      <EmptyState message={es.message} hint={es.hint} />
                    </div>
                  );
                })()
              )}
            </LoadingState>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="document-verification" pt="md">
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
              (() => {
                const es = getEmptyState('generic', 'noData');
                return (
                  <div className="info-section">
                    <h3>Document Verification</h3>
                    <EmptyState message={es.message} hint={es.hint} />
                  </div>
                );
              })()
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="authentication-tier" pt="md">
          <div className="tab-content">
            {legalEntity ? (
              <TierManagement legalEntityId={legalEntity.legal_entity_id!} />
            ) : (
              (() => {
                const es = getEmptyState('generic', 'noData');
                return (
                  <div className="info-section">
                    <h3>Authentication Tier Management</h3>
                    <EmptyState message={es.message} hint={es.hint} />
                  </div>
                );
              })()
            )}
          </div>
        </Tabs.Panel>

        {hasKvkRegistryData && (
          <Tabs.Panel value="kvk-registry" pt="md">
            <div className="tab-content">
              {legalEntity ? (
                <KvkRegistryDetails legalEntityId={legalEntity.legal_entity_id!} />
              ) : (
                (() => {
                  const es = getEmptyState('generic', 'noData');
                  return (
                    <div className="info-section">
                      <h3>KvK Registry Data</h3>
                      <EmptyState message={es.message} hint={es.hint} />
                    </div>
                  );
                })()
              )}
            </div>
          </Tabs.Panel>
        )}
      </Tabs>
    </div>
  );
};
