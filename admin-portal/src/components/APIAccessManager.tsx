/**
 * API Access Manager - Combined view for all API authentication methods
 * Consolidates legacy tokens and modern M2M clients in one place
 */

import type React from 'react';
import { M2MClientsManager } from './M2MClientsManager';
import { TokensManager } from './TokensManager';
import type { LegalEntityEndpoint } from '../services/apiV2';
import './IdentifiersManager.css';

interface APIAccessManagerProps {
  legalEntityId: string;
  legalEntityName: string;
  orgId: string;
  endpoints: LegalEntityEndpoint[];
  onIssueToken: (orgId: string) => Promise<void>;
}

export const APIAccessManager: React.FC<APIAccessManagerProps> = ({
  legalEntityId,
  legalEntityName,
  orgId,
  endpoints,
  onIssueToken,
}) => {
  return (
    <div className="identifiers-manager" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* M2M API Clients Section */}
      <div style={{ marginBottom: '60px' }}>
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <div>
            <h3>M2M API Clients (Modern Authentication)</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '8px 0 0 0', maxWidth: '800px' }}>
              Create API clients for external systems to securely access CTN data using OAuth 2.0 Client Credentials flow.
              Each client receives a unique Client ID and Secret with granular scope-based permissions.
              <strong> This is the recommended method for system-to-system integration.</strong>
            </p>
          </div>
        </div>

        <M2MClientsManager
          legalEntityId={legalEntityId}
          legalEntityName={legalEntityName}
        />
      </div>

      {/* Legacy Tokens Section */}
      <div>
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <div>
            <h3>Access Tokens (Legacy)</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '8px 0 0 0', maxWidth: '800px' }}>
              Legacy token-based authentication for registered endpoints. Tokens are tied to specific system endpoints
              and provide endpoint-level access control.
              <strong> For new integrations, use M2M API Clients above instead.</strong>
            </p>
          </div>
        </div>

        <TokensManager
          legalEntityId={orgId}
          endpoints={endpoints}
          onIssueToken={onIssueToken}
        />
      </div>
    </div>
  );
};
