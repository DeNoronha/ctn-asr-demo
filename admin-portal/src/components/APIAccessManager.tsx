/**
 * API Access Manager - M2M Client Authentication
 * Modern OAuth 2.0 Client Credentials flow for system-to-system integration
 */

import type React from 'react';
import { M2MClientsManager } from './M2MClientsManager';
import './IdentifiersManager.css';

interface APIAccessManagerProps {
  legalEntityId: string;
  legalEntityName: string;
}

export const APIAccessManager: React.FC<APIAccessManagerProps> = ({
  legalEntityId,
  legalEntityName,
}) => {
  return (
    <div className="identifiers-manager">
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div>
          <h3>M2M API Clients</h3>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '8px 0 0 0', maxWidth: '800px' }}>
            Create API clients for external systems to securely access CTN data using OAuth 2.0 Client Credentials flow.
            Each client receives a unique Client ID and Secret with granular scope-based permissions.
          </p>
        </div>
      </div>

      <M2MClientsManager
        legalEntityId={legalEntityId}
        legalEntityName={legalEntityName}
      />
    </div>
  );
};
