import type React from 'react';
import { useState } from 'react';

interface TokensProps {
  apiBaseUrl: string;
  getAccessToken: () => Promise<string>;
}

interface Token {
  jti: string;
  token_type: string;
  issued_at: string;
  expires_at: string;
  revoked: boolean;
}

export const Tokens: React.FC<TokensProps> = ({ apiBaseUrl, getAccessToken }) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestToken = async () => {
    setLoading(true);
    setError(null);
    setNewToken(null);

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`${apiBaseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          scope: 'member.read member.write',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate token: ${response.status}`);
      }

      const data = await response.json();
      setNewToken(data.access_token);

      // Refresh token list
      await loadTokens();
    } catch (err: any) {
      setError(err.message || 'Failed to generate token');
    } finally {
      setLoading(false);
    }
  };

  const loadTokens = async () => {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`${apiBaseUrl}/tokens`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTokens(data.tokens || []);
      }
    } catch (err) {
      console.error('Failed to load tokens:', err);
    }
  };

  const copyToken = () => {
    if (newToken) {
      navigator.clipboard.writeText(newToken);
    }
  };

  return (
    <div className="tokens">
      <h2>API Tokens</h2>

      <div className="tokens-header">
        <p>Generate API tokens to authenticate your systems with the CTN network.</p>
        <button onClick={requestToken} disabled={loading} className="btn-primary">
          {loading ? 'Generating...' : 'Generate New Token'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {newToken && (
        <div className="alert alert-success">
          <h3>New Token Generated</h3>
          <p className="text-warning">⚠️ Copy this token now. You won't be able to see it again!</p>
          <div className="token-display">
            <code>{newToken}</code>
            <button onClick={copyToken} className="btn-secondary">
              Copy
            </button>
          </div>
        </div>
      )}

      <div className="tokens-list">
        <h3>Your Tokens</h3>
        {tokens.length === 0 ? (
          <p className="text-muted">
            No tokens generated yet. Click "Generate New Token" to create one.
          </p>
        ) : (
          <table className="tokens-table">
            <thead>
              <tr>
                <th>Token ID</th>
                <th>Type</th>
                <th>Issued</th>
                <th>Expires</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => (
                <tr key={token.jti}>
                  <td>
                    <code>{token.jti.substring(0, 8)}...</code>
                  </td>
                  <td>{token.token_type}</td>
                  <td>{new Date(token.issued_at).toLocaleDateString()}</td>
                  <td>{new Date(token.expires_at).toLocaleDateString()}</td>
                  <td>
                    <span className={token.revoked ? 'status-revoked' : 'status-active'}>
                      {token.revoked ? 'Revoked' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
