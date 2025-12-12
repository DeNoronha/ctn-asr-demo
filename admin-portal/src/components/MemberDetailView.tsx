/**
 * Member Detail View - Full page member details with tabs
 */

import { Button, Tabs } from '@mantine/core';
import type React from 'react';
import { useState } from 'react';
import { RoleGuard } from '../auth/ProtectedRoute';
import { UserRole } from '../auth/authConfig';
import { useNotification } from '../contexts/NotificationContext';
import { useApiError } from '../hooks/useApiError';
import { useMemberDetails } from '../hooks/useMemberDetails';
import { type Member, api } from '../services/api';
import { apiV2 } from "../services/api";
import { getMembershipColor, getStatusColor } from '../utils/colors';
import { getEmptyState } from '../utils/emptyStates';
import { logger } from '../utils/logger';
import { CompanyDetails } from './CompanyDetails';
import { CompanyForm } from './CompanyForm';
import { EmptyState } from './EmptyState';
import { ArrowLeft } from './icons';
import {
  APIAccessSection,
  AuthenticationTierSection,
  ContactsSection,
  DocumentVerificationSection,
  IdentifiersSection,
  KvkRegistrySection,
  LeiRegistrySection,
  PeppolRegistrySection,
  ViesRegistrySection,
  SystemIntegrationsSection,
} from './member/MemberDetailSections';
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
  const notification = useNotification();
  const { handleError } = useApiError();

  // Use custom hook for all member data management
  const { legalEntity, contacts, identifiers, hasKvkRegistryData, hasLeiRegistryData, hasPeppolRegistryData, hasViesRegistryData, loading, handlers } =
    useMemberDetails(member.legal_entity_id);

  const handleUpdateCompany = async (data: typeof legalEntity) => {
    if (!data) return;
    await handlers.updateLegalEntity(data);
    setIsEditingCompany(false);
  };

  const handleCreateLegalEntity = async () => {
    if (!member.legal_entity_id) {
      notification.showError('Cannot create legal entity: member has no legal_entity_id');
      return;
    }

    try {
      await apiV2.createLegalEntity({
        legal_entity_id: member.legal_entity_id,
        primary_legal_name: member.legal_name,
        status: 'ACTIVE',
        domain: member.domain,
      });

      notification.showSuccess(
        'Legal entity created successfully. You can now manage identifiers.'
      );

      // Reload page to show updated data
      window.location.reload();
    } catch (error: unknown) {
      handleError(error, 'creating legal entity');
    }
  };

  const handleApproveMember = async () => {
    try {
      await apiV2.updateMemberStatus(member.legal_entity_id, 'ACTIVE', 'Approved by admin');
      notification.showSuccess('Member activated successfully');
      // Reload page to show updated status
      window.location.reload();
    } catch (error: unknown) {
      handleError(error, 'activating member');
    }
  };

  const handleVerificationComplete = () => {
    if (member.legal_entity_id) {
      api.getLegalEntity(member.legal_entity_id);
      handlers.refreshKvkData();
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
          {hasLeiRegistryData && <Tabs.Tab value="lei-registry">GLEIF Registry</Tabs.Tab>}
          {hasPeppolRegistryData && <Tabs.Tab value="peppol-registry">Peppol Registry</Tabs.Tab>}
          {hasViesRegistryData && <Tabs.Tab value="vies-registry">VIES Registry</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="company-details" pt="md">
          <div className="tab-content">
            <LoadingState loading={loading} minHeight={300}>
              {legalEntity ? (
                !isEditingCompany ? (
                  <>
                    <CompanyDetails
                      company={legalEntity}
                      onEdit={() => setIsEditingCompany(true)}
                    />
                    <div className="info-section">
                      <h3>Member Information</h3>
                      <div className="info-grid">
                        <div className="info-field">
                          <strong>Legal Entity ID</strong>
                          <span>{member.legal_entity_id}</span>
                        </div>
                        <div className="info-field">
                          <strong>Domain</strong>
                          <span>{member.domain}</span>
                        </div>
                        <div className="info-field">
                          <strong>Status</strong>
                          {getStatusBadge(member.status)}
                        </div>
                        <div className="info-field">
                          <strong>Membership Level</strong>
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
                      <strong>Legal Entity ID</strong>
                      <span>{member.legal_entity_id}</span>
                    </div>
                    <div className="info-field">
                      <strong>Legal Name</strong>
                      <span>{member.legal_name}</span>
                    </div>
                    <div className="info-field">
                      <strong>Domain</strong>
                      <span>{member.domain}</span>
                    </div>
                    <div className="info-field">
                      <strong>Status</strong>
                      {getStatusBadge(member.status)}
                    </div>
                    <div className="info-field">
                      <strong>Membership Level</strong>
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

        <IdentifiersSection
          member={member}
          legalEntity={legalEntity}
          identifiers={identifiers}
          loading={loading}
          onIdentifierCreate={handlers.createIdentifier}
          onIdentifierUpdate={handlers.updateIdentifier}
          onIdentifierDelete={handlers.deleteIdentifier}
          onRefresh={handlers.refreshIdentifiers}
          onCreateLegalEntity={handleCreateLegalEntity}
        />

        <SystemIntegrationsSection member={member} />

        <APIAccessSection member={member} legalEntity={legalEntity} />

        <ContactsSection
          legalEntity={legalEntity}
          contacts={contacts}
          loading={loading}
          onContactCreate={handlers.createContact}
          onContactUpdate={handlers.updateContact}
          onContactDelete={handlers.deleteContact}
        />

        <DocumentVerificationSection
          member={member}
          legalEntity={legalEntity}
          onVerificationComplete={handleVerificationComplete}
        />

        <AuthenticationTierSection legalEntity={legalEntity} />

        {hasKvkRegistryData && <KvkRegistrySection legalEntity={legalEntity} />}

        {hasLeiRegistryData && <LeiRegistrySection legalEntity={legalEntity} />}

        {hasPeppolRegistryData && <PeppolRegistrySection legalEntity={legalEntity} />}

        {hasViesRegistryData && <ViesRegistrySection legalEntity={legalEntity} />}
      </Tabs>
    </div>
  );
};
