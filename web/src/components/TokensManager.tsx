import { Button } from '@progress/kendo-react-buttons';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Grid, GridColumn, GridToolbar } from '@progress/kendo-react-grid';
import { AlertTriangle, CheckCircle, Copy, Key, Trash2, XCircle } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { formatDate } from '../utils/dateUtils';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import './TokensManager.css';

interface Endpoint {
  legal_entity_endpoint_id: string;
  endpoint_name: string;
  data_category: string;
}

interface Token {
  endpoint_authorization_id: string;
  legal_entity_endpoint_id: string;
  endpoint_name?: string;
  token_value?: string;
  token_type: string;
  token_hash?: string;
  issued_at: string;
  expires_at: string;
  revoked_at?: string;
  revocation_reason?: string;
  is_active: boolean;
  last_used_at?: string;
  usage_count?: number;
}

interface TokensManagerProps {
  legalEntityId: string;
  endpoints: Endpoint[];
  onIssueToken: (orgId: string) => Promise<void>;
}

const API_BASE =
  process.env.REACT_APP_API_URL || 'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1';

export const TokensManager: React.FC<TokensManagerProps> = ({
  legalEntityId,
  endpoints,
  onIssueToken,
}) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [_loading, setLoading] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
  const [tokenToRevoke, setTokenToRevoke] = useState<Token | null>(null);
  const notification = useNotification();

  useEffect(() => {
    loadAllTokens();
  }, [legalEntityId, endpoints]);

  const loadAllTokens = async () => {
    setLoading(true);
    try {
      const allTokens: Token[] = [];

      // Load tokens for each endpoint
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(
            `${API_BASE}/endpoints/${endpoint.legal_entity_endpoint_id}/tokens`
          );
          if (response.ok) {
            const endpointTokens = await response.json();
            // Add endpoint name to each token for display
            const tokensWithEndpoint = endpointTokens.map((token: Token) => ({
              ...token,
              endpoint_name: endpoint.endpoint_name,
              legal_entity_endpoint_id: endpoint.legal_entity_endpoint_id,
            }));
            allTokens.push(...tokensWithEndpoint);
          }
        } catch (error) {
          console.error(`Error loading tokens for endpoint ${endpoint.endpoint_name}:`, error);
        }
      }

      setTokens(allTokens);
    } catch (error) {
      console.error('Error loading tokens:', error);
      notification.showError('Failed to load tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeClick = (token: Token) => {
    setTokenToRevoke(token);
    setRevokeConfirmOpen(true);
  };

  const handleRevokeConfirm = async () => {
    if (!tokenToRevoke) return;

    try {
      const response = await fetch(
        `${API_BASE}/tokens/${tokenToRevoke.endpoint_authorization_id}/revoke`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Revoked by administrator' }),
        }
      );

      if (response.ok) {
        notification.showSuccess('Token revoked successfully');
        loadAllTokens();
      } else {
        notification.showError('Failed to revoke token');
      }
    } catch (error) {
      console.error('Error revoking token:', error);
      notification.showError('Failed to revoke token');
    }
  };

  const handleCopy = (tokenValue: string) => {
    navigator.clipboard.writeText(tokenValue);
    notification.showSuccess('Token copied to clipboard');
  };

  const getStatusBadge = (token: Token) => {
    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    const daysUntilExpiry = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (token.revoked_at) {
      return (
        <span className="token-status-badge revoked">
          <XCircle size={14} />
          Revoked
        </span>
      );
    }

    if (expiresAt < now) {
      return (
        <span className="token-status-badge expired">
          <XCircle size={14} />
          Expired
        </span>
      );
    }

    if (daysUntilExpiry <= 30) {
      return (
        <span className="token-status-badge expiring">
          <AlertTriangle size={14} />
          Expiring Soon ({daysUntilExpiry}d)
        </span>
      );
    }

    return (
      <span className="token-status-badge active">
        <CheckCircle size={14} />
        Active
      </span>
    );
  };

  const StatusCell = (props: any) => {
    return <td>{getStatusBadge(props.dataItem)}</td>;
  };

  const DateCell = (props: any) => {
    const { field, dataItem } = props;
    const value = dataItem[field];

    if (!value) return <td>-</td>;

    return <td>{formatDate(value)}</td>;
  };

  const handleKeyDown = (
    event: React.KeyboardEvent,
    action: () => void,
    disabled: boolean = false
  ) => {
    // Handle Enter and Space keys for keyboard accessibility (WCAG 2.1 Level AA)
    if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault(); // Prevent page scroll on Space
      action();
    }
  };

  const ActionsCell = (props: any) => {
    const token = props.dataItem;
    const isActive = !token.revoked_at && new Date(token.expires_at) > new Date();

    return (
      <td className="actions-cell">
        {token.token_value && (
          <Button
            fillMode="flat"
            size="small"
            title="Copy token value"
            aria-label="Copy token value"
            onClick={() => handleCopy(token.token_value!)}
            onKeyDown={(e) => handleKeyDown(e, () => handleCopy(token.token_value!), !isActive)}
            disabled={!isActive}
            tabIndex={isActive ? 0 : -1}
          >
            <Copy size={16} />
          </Button>
        )}
        <Button
          fillMode="flat"
          size="small"
          title="Revoke token"
          aria-label="Revoke token"
          onClick={() => handleRevokeClick(token)}
          onKeyDown={(e) => handleKeyDown(e, () => handleRevokeClick(token), !!token.revoked_at)}
          disabled={!!token.revoked_at}
          tabIndex={token.revoked_at ? -1 : 0}
        >
          <Trash2 size={16} />
        </Button>
      </td>
    );
  };

  // Filter tokens by endpoint if selected
  const filteredTokens = selectedEndpoint
    ? tokens.filter((t) => t.legal_entity_endpoint_id === selectedEndpoint)
    : tokens;

  // Sort tokens by last_used_at (most recent first), then by issued_at
  const sortedTokens = [...filteredTokens].sort((a, b) => {
    // Tokens with last_used_at come first
    if (a.last_used_at && !b.last_used_at) return -1;
    if (!a.last_used_at && b.last_used_at) return 1;

    // Both have last_used_at - sort by most recent
    if (a.last_used_at && b.last_used_at) {
      return new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime();
    }

    // Neither have last_used_at - sort by issued_at (most recent first)
    return new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime();
  });

  // Endpoint filter options
  const endpointOptions = [
    { value: null, label: 'All Endpoints' },
    ...endpoints.map((e) => ({
      value: e.legal_entity_endpoint_id,
      label: e.endpoint_name,
    })),
  ];

  const selectedEndpointOption =
    endpointOptions.find((e) => e.value === selectedEndpoint) || endpointOptions[0];

  return (
    <div className="tokens-manager">
      <div className="tokens-header">
        <h3>Token Management</h3>
        <p className="tokens-description">
          View and manage access tokens for all endpoints. Active tokens grant API access to member
          systems.
        </p>
      </div>

      {tokens.length > 0 ? (
        <Grid data={sortedTokens} style={{ height: '450px' }}>
          <GridToolbar>
            <div className="toolbar-content">
              <div className="filter-section">
                <label>Filter by Endpoint:</label>
                <DropDownList
                  data={endpointOptions}
                  textField="label"
                  dataItemKey="value"
                  value={selectedEndpointOption}
                  onChange={(e) => setSelectedEndpoint(e.value.value)}
                  style={{ width: '250px', marginLeft: '10px' }}
                />
              </div>
              <div className="stats-section">
                <span className="stat-badge">Total: {sortedTokens.length}</span>
                <span className="stat-badge active">
                  Active:{' '}
                  {
                    sortedTokens.filter(
                      (t) => !t.revoked_at && new Date(t.expires_at) > new Date()
                    ).length
                  }
                </span>
              </div>
            </div>
          </GridToolbar>

          <GridColumn
            field="endpoint_name"
            title="Endpoint"
            width="250px"
            minResizableWidth={150}
          />
          <GridColumn field="token_type" title="Type" width="100px" />
          <GridColumn field="issued_at" title="Issued" width="130px" cell={DateCell} />
          <GridColumn field="expires_at" title="Expires" width="130px" cell={DateCell} />
          <GridColumn field="status" title="Status" width="160px" cell={StatusCell} />
          <GridColumn field="last_used_at" title="Last Used" width="130px" cell={DateCell} />
          <GridColumn field="usage_count" title="Usage" width="80px" />
          <GridColumn
            title="Actions"
            width="120px"
            cell={ActionsCell}
            headerClassName="center-header"
          />
        </Grid>
      ) : (
        <EmptyState
          icon={<Key size={48} />}
          message="No tokens issued yet"
          hint="Tokens are issued per endpoint. Go to the Endpoints tab to register systems and issue tokens."
        />
      )}

      {endpoints.length === 0 && (
        <div className="warning-message">
          <AlertTriangle size={20} />
          <div>
            <strong>No endpoints registered</strong>
            <p>Register an endpoint first to issue access tokens</p>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={revokeConfirmOpen}
        title="Revoke Token"
        message={`Are you sure you want to revoke the token for ${tokenToRevoke?.endpoint_name}? The member will immediately lose access to the API endpoint. This action cannot be undone.`}
        confirmLabel="Revoke"
        confirmTheme="error"
        icon={<AlertTriangle size={24} />}
        onConfirm={handleRevokeConfirm}
        onCancel={() => setRevokeConfirmOpen(false)}
      />
    </div>
  );
};
