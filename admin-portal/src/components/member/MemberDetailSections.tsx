/**
 * Member Detail Sections
 * Extracted tab panel sections for MemberDetailView to reduce complexity
 */

import { Tabs } from '@mantine/core';
import type React from 'react';
import type { LegalEntity, LegalEntityContact, Member } from '../../services/api';
import { api, apiV2 } from '../../services/api';
import type { LegalEntityIdentifier } from '../../services/api';
import { getEmptyState } from '../../utils/emptyStates';
import { APIAccessManager } from '../APIAccessManager';
import { BelgiumRegistryDetails } from '../BelgiumRegistryDetails';
import { ContactsManager } from '../ContactsManager';
import { EmptyState } from '../EmptyState';
import { EndpointManagement } from '../EndpointManagement';
import { EoriRegistryDetails } from '../EoriRegistryDetails';
import { GermanRegistryDetails } from '../GermanRegistryDetails';
import { IdentifiersManager } from '../IdentifiersManager';
import { KvkDocumentUpload } from '../KvkDocumentUpload';
import { KvkRegistryDetails } from '../KvkRegistryDetails';
import { LeiRegistryDetails } from '../LeiRegistryDetails';
import { PeppolRegistryDetails } from '../PeppolRegistryDetails';
import { TierManagement } from '../TierManagement';
import { ViesRegistryDetails } from '../ViesRegistryDetails';
import { LoadingState } from '../shared/LoadingState';

interface IdentifiersSectionProps {
  member: Member;
  legalEntity: LegalEntity | null;
  identifiers: LegalEntityIdentifier[];
  loading: boolean;
  onIdentifierCreate: (
    identifier: Omit<
      LegalEntityIdentifier,
      'legal_entity_reference_id' | 'dt_created' | 'dt_modified'
    >
  ) => Promise<LegalEntityIdentifier>;
  onIdentifierUpdate: (
    identifierId: string,
    data: Partial<LegalEntityIdentifier>
  ) => Promise<LegalEntityIdentifier>;
  onIdentifierDelete: (identifierId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onCreateLegalEntity: () => Promise<void>;
}

export const IdentifiersSection: React.FC<IdentifiersSectionProps> = ({
  member,
  legalEntity,
  identifiers,
  loading,
  onIdentifierCreate,
  onIdentifierUpdate,
  onIdentifierDelete,
  onRefresh,
  onCreateLegalEntity,
}) => {
  return (
    <Tabs.Panel value="identifiers" pt="md">
      <div className="tab-content">
        <LoadingState loading={loading} minHeight={300}>
          {legalEntity ? (
            <IdentifiersManager
              // biome-ignore lint/style/noNonNullAssertion: member.legal_entity_id cannot be null when legalEntity exists
              legalEntityId={member.legal_entity_id!}
              identifiers={identifiers}
              onIdentifierCreate={onIdentifierCreate}
              onIdentifierUpdate={onIdentifierUpdate}
              onIdentifierDelete={onIdentifierDelete}
              onRefresh={onRefresh}
            />
          ) : member.legal_entity_id ? (
            (() => {
              const es = getEmptyState('identifier', 'noIdentifiers');
              return (
                <div className="info-section" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <h3>Legal Identifiers</h3>
                  <EmptyState
                    message={es.message}
                    hint={es.hint}
                    action={{ label: 'Create Legal Entity', onClick: onCreateLegalEntity }}
                  />
                </div>
              );
            })()
          ) : (
            (() => {
              const es = getEmptyState('generic', 'noData');
              return (
                <div className="info-section" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <h3>Legal Identifiers</h3>
                  <EmptyState message={es.message} hint={es.hint} />
                </div>
              );
            })()
          )}
        </LoadingState>
      </div>
    </Tabs.Panel>
  );
};

interface ContactsSectionProps {
  legalEntity: LegalEntity | null;
  contacts: LegalEntityContact[];
  loading: boolean;
  onContactCreate: (
    contact: Omit<LegalEntityContact, 'legal_entity_contact_id' | 'dt_created' | 'dt_modified'>
  ) => Promise<LegalEntityContact>;
  onContactUpdate: (
    contactId: string,
    data: Partial<LegalEntityContact>
  ) => Promise<LegalEntityContact>;
  onContactDelete: (contactId: string) => Promise<void>;
}

export const ContactsSection: React.FC<ContactsSectionProps> = ({
  legalEntity,
  contacts,
  loading,
  onContactCreate,
  onContactUpdate,
  onContactDelete,
}) => {
  return (
    <Tabs.Panel value="contacts" pt="md">
      <div className="tab-content">
        <LoadingState loading={loading} minHeight={300}>
          {legalEntity ? (
            <ContactsManager
              // biome-ignore lint/style/noNonNullAssertion: legalEntity null-check performed in ternary guard above
              legalEntityId={legalEntity.legal_entity_id!}
              contacts={contacts}
              onContactCreate={onContactCreate}
              onContactUpdate={onContactUpdate}
              onContactDelete={onContactDelete}
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
  );
};

interface SystemIntegrationsSectionProps {
  member: Member;
}

export const SystemIntegrationsSection: React.FC<SystemIntegrationsSectionProps> = ({ member }) => {
  return (
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
            webhooks, and event updates. These are <strong>outbound integrations</strong> from CTN
            to your systems.
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
  );
};

interface APIAccessSectionProps {
  member: Member;
  legalEntity: LegalEntity | null;
}

export const APIAccessSection: React.FC<APIAccessSectionProps> = ({ member, legalEntity }) => {
  return (
    <Tabs.Panel value="api-access" pt="md">
      <div className="tab-content">
        {legalEntity ? (
          <APIAccessManager
            // biome-ignore lint/style/noNonNullAssertion: legalEntity null-check performed in ternary guard above
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
  );
};

interface DocumentVerificationSectionProps {
  member: Member;
  legalEntity: LegalEntity | null;
  onVerificationComplete: () => void;
}

export const DocumentVerificationSection: React.FC<DocumentVerificationSectionProps> = ({
  member: _member,
  legalEntity,
  onVerificationComplete,
}) => {
  return (
    <Tabs.Panel value="document-verification" pt="md">
      <div className="tab-content">
        {legalEntity ? (
          <KvkDocumentUpload
            // biome-ignore lint/style/noNonNullAssertion: legalEntity null-check performed in ternary guard above
            legalEntityId={legalEntity.legal_entity_id!}
            onVerificationComplete={onVerificationComplete}
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
  );
};

interface AuthenticationTierSectionProps {
  legalEntity: LegalEntity | null;
}

export const AuthenticationTierSection: React.FC<AuthenticationTierSectionProps> = ({
  legalEntity,
}) => {
  return (
    <Tabs.Panel value="authentication-tier" pt="md">
      <div className="tab-content">
        {legalEntity ? (
          <TierManagement
            // biome-ignore lint/style/noNonNullAssertion: legalEntity null-check performed in ternary guard above
            legalEntityId={legalEntity.legal_entity_id!}
          />
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
  );
};

interface KvkRegistrySectionProps {
  legalEntity: LegalEntity | null;
}

export const KvkRegistrySection: React.FC<KvkRegistrySectionProps> = ({ legalEntity }) => {
  return (
    <Tabs.Panel value="kvk-registry" pt="md">
      <div className="tab-content">
        {legalEntity ? (
          <KvkRegistryDetails
            // biome-ignore lint/style/noNonNullAssertion: legalEntity null-check performed in ternary guard above
            legalEntityId={legalEntity.legal_entity_id!}
          />
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
  );
};

interface LeiRegistrySectionProps {
  legalEntity: LegalEntity | null;
}

export const LeiRegistrySection: React.FC<LeiRegistrySectionProps> = ({ legalEntity }) => {
  return (
    <Tabs.Panel value="lei-registry" pt="md">
      <div className="tab-content">
        {legalEntity ? (
          <LeiRegistryDetails
            // biome-ignore lint/style/noNonNullAssertion: legalEntity null-check performed in ternary guard above
            legalEntityId={legalEntity.legal_entity_id!}
          />
        ) : (
          (() => {
            const es = getEmptyState('generic', 'noData');
            return (
              <div className="info-section">
                <h3>LEI Registry Data</h3>
                <EmptyState message={es.message} hint={es.hint} />
              </div>
            );
          })()
        )}
      </div>
    </Tabs.Panel>
  );
};

interface PeppolRegistrySectionProps {
  legalEntity: LegalEntity | null;
}

export const PeppolRegistrySection: React.FC<PeppolRegistrySectionProps> = ({ legalEntity }) => {
  return (
    <Tabs.Panel value="peppol-registry" pt="md">
      <div className="tab-content">
        {legalEntity ? (
          <PeppolRegistryDetails
            // biome-ignore lint/style/noNonNullAssertion: legalEntity null-check performed in ternary guard above
            legalEntityId={legalEntity.legal_entity_id!}
          />
        ) : (
          (() => {
            const es = getEmptyState('generic', 'noData');
            return (
              <div className="info-section">
                <h3>Peppol Registry Data</h3>
                <EmptyState message={es.message} hint={es.hint} />
              </div>
            );
          })()
        )}
      </div>
    </Tabs.Panel>
  );
};

interface ViesRegistrySectionProps {
  legalEntity: LegalEntity | null;
}

export const ViesRegistrySection: React.FC<ViesRegistrySectionProps> = ({ legalEntity }) => {
  return (
    <Tabs.Panel value="vies-registry" pt="md">
      <div className="tab-content">
        {legalEntity ? (
          <ViesRegistryDetails
            // biome-ignore lint/style/noNonNullAssertion: legalEntity null-check performed in ternary guard above
            legalEntityId={legalEntity.legal_entity_id!}
          />
        ) : (
          (() => {
            const es = getEmptyState('generic', 'noData');
            return (
              <div className="info-section">
                <h3>VIES Registry Data</h3>
                <EmptyState message={es.message} hint={es.hint} />
              </div>
            );
          })()
        )}
      </div>
    </Tabs.Panel>
  );
};

interface GermanRegistrySectionProps {
  legalEntity: LegalEntity | null;
}

export const GermanRegistrySection: React.FC<GermanRegistrySectionProps> = ({ legalEntity }) => {
  return (
    <Tabs.Panel value="german-registry" pt="md">
      <div className="tab-content">
        {legalEntity ? (
          <GermanRegistryDetails
            // biome-ignore lint/style/noNonNullAssertion: legalEntity null-check performed in ternary guard above
            legalEntityId={legalEntity.legal_entity_id!}
          />
        ) : (
          (() => {
            const es = getEmptyState('generic', 'noData');
            return (
              <div className="info-section">
                <h3>German Registry Data</h3>
                <EmptyState message={es.message} hint={es.hint} />
              </div>
            );
          })()
        )}
      </div>
    </Tabs.Panel>
  );
};

interface EoriRegistrySectionProps {
  legalEntity: LegalEntity | null;
}

export const EoriRegistrySection: React.FC<EoriRegistrySectionProps> = ({ legalEntity }) => {
  return (
    <Tabs.Panel value="eori-registry" pt="md">
      <div className="tab-content">
        {legalEntity ? (
          <EoriRegistryDetails
            // biome-ignore lint/style/noNonNullAssertion: legalEntity null-check performed in ternary guard above
            legalEntityId={legalEntity.legal_entity_id!}
          />
        ) : (
          (() => {
            const es = getEmptyState('generic', 'noData');
            return (
              <div className="info-section">
                <h3>EORI Registry Data</h3>
                <EmptyState message={es.message} hint={es.hint} />
              </div>
            );
          })()
        )}
      </div>
    </Tabs.Panel>
  );
};

interface BelgiumRegistrySectionProps {
  legalEntity: LegalEntity | null;
}

export const BelgiumRegistrySection: React.FC<BelgiumRegistrySectionProps> = ({ legalEntity }) => {
  return (
    <Tabs.Panel value="belgium-registry" pt="md">
      <div className="tab-content">
        {legalEntity ? (
          <BelgiumRegistryDetails
            // biome-ignore lint/style/noNonNullAssertion: legalEntity null-check performed in ternary guard above
            legalEntityId={legalEntity.legal_entity_id!}
          />
        ) : (
          (() => {
            const es = getEmptyState('generic', 'noData');
            return (
              <div className="info-section">
                <h3>Belgium KBO Registry Data</h3>
                <EmptyState message={es.message} hint={es.hint} />
              </div>
            );
          })()
        )}
      </div>
    </Tabs.Panel>
  );
};
