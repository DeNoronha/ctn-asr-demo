/**
 * API Access View - Member Portal
 * Consolidates M2M Clients (modern) and Tokens (legacy) in one view
 */

import React from 'react';
import { M2MClientsView } from './M2MClientsView';
import { TokensView } from './TokensView';

interface APIAccessViewProps {
  getAccessToken: () => Promise<string>;
  apiBaseUrl: string;
  memberData: any;
  onNotification: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const APIAccessView: React.FC<APIAccessViewProps> = ({
  getAccessToken,
  apiBaseUrl,
  memberData,
  onNotification,
}) => {
  if (!memberData?.legal_entity_id) {
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
      {/* M2M API Clients Section */}
      <div style={{ marginBottom: '60px' }}>
        <div style={{ marginBottom: '16px', padding: '20px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
          <h3 style={{ margin: '0 0 8px 0' }}>M2M API Clients (Modern Authentication)</h3>
          <p style={{ color: '#0369a1', fontSize: '0.875rem', margin: 0, maxWidth: '800px' }}>
            Create API clients for your systems to securely access CTN data using OAuth 2.0 Client Credentials flow.
            Each client receives a unique Client ID and Secret with granular scope-based permissions.
            <strong> This is the recommended method for system-to-system integration.</strong>
          </p>
        </div>

        <M2MClientsView
          legalEntityId={memberData.legal_entity_id}
          legalEntityName={memberData.legalName}
          getAccessToken={getAccessToken}
          apiBaseUrl={apiBaseUrl}
          onNotification={onNotification}
        />
      </div>

      {/* Legacy Tokens Section */}
      <div>
        <div style={{ marginBottom: '16px', padding: '20px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
          <h3 style={{ margin: '0 0 8px 0' }}>Access Tokens (Legacy)</h3>
          <p style={{ color: '#92400e', fontSize: '0.875rem', margin: 0, maxWidth: '800px' }}>
            Legacy token-based authentication for registered endpoints. Tokens are tied to specific system endpoints
            and provide endpoint-level access control.
            <strong> For new integrations, use M2M API Clients above instead.</strong>
          </p>
        </div>

        <TokensView
          getAccessToken={getAccessToken}
          apiBaseUrl={apiBaseUrl}
          memberData={memberData}
          onNotification={onNotification}
          onDataChange={() => {}}
        />
      </div>
    </div>
  );
};
