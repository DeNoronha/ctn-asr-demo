/**
 * API Access View - Member Portal
 * Tabbed interface for M2M Clients (modern) and Tokens (legacy)
 */

import { Tabs } from '@mantine/core';
import type React from 'react';
import { useState } from 'react';
import type { MemberData } from '../types';
import { M2MClientsView } from './M2MClientsView';
import { TokensView } from './TokensView';
import { Key, Plug } from './icons';

interface APIAccessViewProps {
  getAccessToken: () => Promise<string>;
  apiBaseUrl: string;
  memberData: MemberData | null;
  onNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const APIAccessView: React.FC<APIAccessViewProps> = ({
  getAccessToken,
  apiBaseUrl,
  memberData,
  onNotification,
}) => {
  const [activeTab, setActiveTab] = useState<string | null>('m2m');

  if (!memberData?.legalEntityId) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h3>API Access</h3>
        <p style={{ color: '#6b7280' }}>
          No legal entity linked to your account. Please contact CTN support.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="m2m" leftSection={<Key size={16} />}>
            M2M API Clients
          </Tabs.Tab>
          <Tabs.Tab value="legacy" leftSection={<Plug size={16} />}>
            API Tokens (Legacy)
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="m2m" pt="md">
          <div
            style={{
              marginBottom: '20px',
              padding: '20px',
              background: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bae6fd',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0' }}>M2M API Clients (Modern Authentication)</h3>
            <p style={{ color: '#0369a1', fontSize: '0.875rem', margin: 0, maxWidth: '800px' }}>
              Create API clients for your systems to securely access CTN data using OAuth 2.0 Client
              Credentials flow. Each client receives a unique Client ID and Secret with granular
              scope-based permissions.
              <strong> This is the recommended method for system-to-system integration.</strong>
            </p>
          </div>

          <M2MClientsView
            legalEntityId={memberData.legalEntityId || ''}
            legalEntityName={memberData.legalName}
            getAccessToken={getAccessToken}
            apiBaseUrl={apiBaseUrl}
            onNotification={onNotification}
          />
        </Tabs.Panel>

        <Tabs.Panel value="legacy" pt="md">
          <div
            style={{
              marginBottom: '20px',
              padding: '20px',
              background: '#fef3c7',
              borderRadius: '8px',
              border: '1px solid #fde68a',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0' }}>Access Tokens (Legacy)</h3>
            <p style={{ color: '#92400e', fontSize: '0.875rem', margin: 0, maxWidth: '800px' }}>
              Legacy token-based authentication for registered endpoints. Tokens are tied to
              specific system endpoints and provide endpoint-level access control.
              <strong> For new integrations, use M2M API Clients instead.</strong>
            </p>
          </div>

          <TokensView
            getAccessToken={getAccessToken}
            apiBaseUrl={apiBaseUrl}
            memberData={memberData}
            onNotification={onNotification}
            onDataChange={() => {}}
          />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
};
