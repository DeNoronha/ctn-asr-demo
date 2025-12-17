/**
 * Member Detail View - Full page member details with tabs
 */

import { Button, Tabs } from '@mantine/core';
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RoleGuard } from '../auth/ProtectedRoute';
import { UserRole } from '../auth/authConfig';
import { useNotification } from '../contexts/NotificationContext';
import { useApiError } from '../hooks/useApiError';
import { useMemberDetails } from '../hooks/useMemberDetails';
import { type Member, api } from '../services/api';
import { apiV2 } from "../services/api";
import { getStatusColor, getTierColor } from '../utils/colors';
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
  GermanRegistrySection,
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
  const { t } = useTranslation();
  logger.log('Member with legal_entity_id:', member.legal_entity_id);
  const [selected, setSelected] = useState<string | null>('company-details');
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const notification = useNotification();
  const { handleError } = useApiError();

  // Use custom hook for all member data management
  const { legalEntity, contacts, identifiers, hasKvkRegistryData, hasLeiRegistryData, hasPeppolRegistryData, hasViesRegistryData, hasGermanRegistryData, loading, handlers } =
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

  const getTierBadge = (tier: number | undefined) => {
    if (!tier) return null;
    return (
      <span className="tier-badge" style={{ backgroundColor: getTierColor(tier) }}>
        {t('memberDetail.tier')} {tier}
      </span>
    );
  };

  return (
    <div className="member-detail-view">
      <div className="detail-header">
        <Button color="gray" onClick={onBack} className="back-button">
          <ArrowLeft size={16} />
          {t('memberDetail.backToMembers')}
        </Button>
        <div className="header-info">
          <h1>{member.legal_name}</h1>
          <div className="header-badges">
            {getStatusBadge(member.status)}
            {getTierBadge(legalEntity?.authentication_tier)}
            {member.status?.toUpperCase() === 'PENDING' && (
              <RoleGuard allowedRoles={[UserRole.ASSOCIATION_ADMIN, UserRole.SYSTEM_ADMIN]}>
                <Button
                  color="green"
                  onClick={handleApproveMember}
                  disabled={loading}
                  style={{ marginLeft: '12px' }}
                  aria-label={t('memberDetail.activateMember')}
                >
                  {t('memberDetail.activateMember')}
                </Button>
              </RoleGuard>
            )}
          </div>
        </div>
      </div>

      <Tabs value={selected} onChange={setSelected} className="detail-tabs">
        <Tabs.List>
          <Tabs.Tab value="company-details">{t('tabs.companyDetails')}</Tabs.Tab>
          <Tabs.Tab value="identifiers">{t('tabs.identifiers')}</Tabs.Tab>
          {/* System Integrations and API Access tabs hidden for debugging - will re-enable later */}
          {/* <Tabs.Tab value="system-integrations">System Integrations</Tabs.Tab> */}
          {/* <Tabs.Tab value="api-access">API Access</Tabs.Tab> */}
          <Tabs.Tab value="contacts">{t('tabs.contacts')}</Tabs.Tab>
          <Tabs.Tab value="document-verification">{t('tabs.documentVerification')}</Tabs.Tab>
          <Tabs.Tab value="authentication-tier">{t('tabs.authenticationTier')}</Tabs.Tab>
          {hasKvkRegistryData && <Tabs.Tab value="kvk-registry">{t('tabs.coc')}</Tabs.Tab>}
          {hasLeiRegistryData && <Tabs.Tab value="lei-registry">{t('tabs.gleif')}</Tabs.Tab>}
          {hasPeppolRegistryData && <Tabs.Tab value="peppol-registry">{t('tabs.peppol')}</Tabs.Tab>}
          {hasViesRegistryData && <Tabs.Tab value="vies-registry">{t('tabs.vies')}</Tabs.Tab>}
          {hasGermanRegistryData && <Tabs.Tab value="german-registry">{t('tabs.handelsregister')}</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="company-details" pt="md">
          <div className="tab-content">
            <LoadingState loading={loading} minHeight={300}>
              {legalEntity ? (
                !isEditingCompany ? (
                  <CompanyDetails
                    company={legalEntity}
                    identifiers={identifiers}
                    onEdit={() => setIsEditingCompany(true)}
                    onRefresh={handlers.enrichAndRefresh}
                  />
                ) : (
                  <CompanyForm
                    data={legalEntity}
                    onSave={handleUpdateCompany}
                    onCancel={() => setIsEditingCompany(false)}
                  />
                )
              ) : (
                <div className="info-section">
                  <h3>{t('companyDetails.basicInformation')}</h3>
                  <div className="info-grid">
                    <div className="info-field">
                      <strong>{t('companyDetails.legalEntityId')}</strong>
                      <span>{member.legal_entity_id}</span>
                    </div>
                    <div className="info-field">
                      <strong>{t('companyDetails.legalName')}</strong>
                      <span>{member.legal_name}</span>
                    </div>
                    <div className="info-field">
                      <strong>{t('companyDetails.domain')}</strong>
                      <span>{member.domain}</span>
                    </div>
                    <div className="info-field">
                      <strong>{t('companyDetails.status')}</strong>
                      {getStatusBadge(member.status)}
                    </div>
                    {/* Membership Level field hidden - membership levels feature disabled */}
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
          onRefresh={handlers.refreshAll}
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

        {hasGermanRegistryData && <GermanRegistrySection legalEntity={legalEntity} />}
      </Tabs>
    </div>
  );
};
