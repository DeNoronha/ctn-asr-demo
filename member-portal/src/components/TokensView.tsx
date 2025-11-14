import { Button, Modal } from '@mantine/core';
import type React from 'react';
import { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import type { ComponentProps, Token } from '../types';
import { LoadingState } from './shared/LoadingState';

export const TokensView: React.FC<ComponentProps> = ({
  apiBaseUrl,
  getAccessToken,
  onNotification,
}) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [showTokenDialog, setShowTokenDialog] = useState(false);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    setLoading(true);
    try {
      const data = await apiClient.member.getTokens();
      setTokens(data.tokens || []);
    } catch (error) {
      console.error('Error loading tokens:', error);
      onNotification('Failed to load tokens', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateToken = async () => {
    setGenerating(true);
    try {
      const data = await apiClient.member.createToken({
        grant_type: 'client_credentials',
        scope: 'member.read member.write',
      });

      setNewToken(data.access_token);
      setShowTokenDialog(true);
      onNotification('Token generated successfully', 'success');

      setTimeout(() => loadTokens(), 1000);
    } catch (_error) {
      onNotification('Failed to generate token', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (newToken) {
      navigator.clipboard.writeText(newToken);
      onNotification('Token copied to clipboard', 'success');
    }
  };

  const activeTokens = tokens.filter(
    (t) => !t.revoked && new Date(t.expires_at) > new Date()
  ).length;

  const getTokenStatus = (token: Token) => {
    const isExpired = new Date(token.expires_at) < new Date();
    const isRevoked = token.revoked;

    if (isRevoked) return { class: 'status-inactive', text: 'Revoked' };
    if (isExpired) return { class: 'status-inactive', text: 'Expired' };
    return { class: 'status-active', text: 'Active' };
  };

  return (
    <div className="tokens-view">
      <div className="page-header">
        <div>
          <h2>API Tokens</h2>
          <p className="page-subtitle">Generate and manage your API authentication tokens</p>
        </div>
        <Button color="blue" onClick={handleGenerateToken} disabled={generating}>
          {generating ? 'Generating...' : 'Generate New Token'}
        </Button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="alert alert-info">
          <div>
            <strong>⚠️ Important Security Notice</strong>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
              Tokens are only shown once when generated. Copy and store them securely. Treat tokens
              like passwords - never share them or commit them to version control.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <LoadingState loading={loading} minHeight={300}>
          {tokens.length === 0 ? (
            <div className="empty-state">
              <h3>No Tokens</h3>
              <p>Generate your first API token to get started.</p>
            </div>
          ) : (
            <>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--ctn-border)' }}>
                Total Tokens: <strong>{tokens.length}</strong> | Active:{' '}
                <strong>{activeTokens}</strong>
              </div>
              <table className="data-table">
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
                  {tokens.map((token) => {
                    const status = getTokenStatus(token);
                    return (
                      <tr key={token.jti}>
                        <td>
                          <code style={{ fontSize: '0.85rem' }}>
                            {token.jti.substring(0, 12)}...
                          </code>
                        </td>
                        <td>{token.token_type}</td>
                        <td>{new Date(token.issued_at).toLocaleString()}</td>
                        <td>{new Date(token.expires_at).toLocaleString()}</td>
                        <td>
                          <span className={status.class}>{status.text}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </LoadingState>
      </div>

      <Modal
        opened={showTokenDialog}
        onClose={() => {
          setShowTokenDialog(false);
          setNewToken(null);
        }}
        title="Token Generated Successfully"
        size="xl"
      >
        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
          <strong>⚠️ Copy this token now!</strong>
          <p style={{ margin: '0.5rem 0 0 0' }}>
            You won't be able to see it again. Store it securely.
          </p>
        </div>

        <div
          style={{
            background: 'var(--ctn-bg)',
            padding: '1rem',
            borderRadius: '6px',
            border: '1px solid var(--ctn-border)',
            marginBottom: '1rem',
          }}
        >
          <label
            htmlFor="access_token"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--ctn-text)',
            }}
          >
            Access Token:
          </label>
          <textarea
            id="access_token"
            readOnly
            value={newToken || ''}
            rows={8}
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              padding: '0.5rem',
              border: '1px solid var(--ctn-border)',
              borderRadius: '4px',
              resize: 'vertical',
            }}
          />
        </div>

        <div className="k-form-buttons k-justify-content-end">
          <Button onClick={copyToClipboard} color="blue">
            Copy to Clipboard
          </Button>
          <Button
            onClick={() => {
              setShowTokenDialog(false);
              setNewToken(null);
            }}
          >
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
};
