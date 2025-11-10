import React, { useEffect, useState } from 'react';
import { Button, TextInput, Text } from '@mantine/core';

import type { ComponentProps } from '../types';

interface DnsToken {
  tokenId: string;
  domain: string;
  token: string;
  recordName: string;
  expiresAt: string;
  status: 'pending' | 'verified' | 'expired' | 'failed';
}

interface VerificationResult {
  verified: boolean;
  details: string;
  resolverResults?: Array<{
    resolver: string;
    found: boolean;
    records?: string[][];
  }>;
}

export const DnsVerificationView: React.FC<ComponentProps> = ({
  apiBaseUrl,
  getAccessToken,
  memberData,
  onNotification,
}) => {
  const [domain, setDomain] = useState('');
  const [tokens, setTokens] = useState<DnsToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPendingTokens();
  }, []);

  const loadPendingTokens = async () => {
    try {
      const token = await getAccessToken();
      const response = await fetch(
        `${apiBaseUrl}/entities/${memberData.legalEntityId}/dns/tokens`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTokens(data.tokens || []);
      }
    } catch (error) {
      console.error('Error loading DNS tokens:', error);
    }
  };

  const handleGenerateToken = async () => {
    if (!domain.trim()) {
      setError('Please enter a domain name');
      return;
    }

    // Validate domain format
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    if (!domainRegex.test(domain)) {
      setError('Invalid domain format. Example: company.com');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const response = await fetch(
        `${apiBaseUrl}/entities/${memberData.legalEntityId}/dns/token`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ domain }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to generate token: ${response.status}`);
      }

      const data = await response.json();
      setTokens([data, ...tokens]);
      setDomain('');
      onNotification('DNS verification token generated successfully', 'success');
    } catch (error) {
      console.error('Error generating DNS token:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate token');
      onNotification('Failed to generate DNS token', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async (tokenId: string) => {
    setVerifying(tokenId);

    try {
      const token = await getAccessToken();
      const response = await fetch(`${apiBaseUrl}/dns/verify/${tokenId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`);
      }

      const result: VerificationResult = await response.json();

      if (result.verified) {
        onNotification(
          'DNS verification successful! Your tier has been upgraded to Tier 2.',
          'success'
        );
        // Reload tokens to update status
        await loadPendingTokens();
      } else {
        onNotification(`Verification failed: ${result.details}`, 'warning');
      }
    } catch (error) {
      console.error('Error verifying DNS token:', error);
      onNotification('Failed to verify DNS token', 'error');
    } finally {
      setVerifying(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onNotification(`${label} copied to clipboard`, 'info');
  };

  return (
    <div className="dns-verification">
      <div className="page-header">
        <div>
          <h2>DNS Verification (Tier 2)</h2>
          <p className="page-subtitle">
            Verify domain ownership to upgrade to Tier 2 and access sensitive data + webhooks
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Generate DNS Verification Token</h3>
        </div>

        <div className="form-field">
          <Text fw={500} mb="xs">Domain Name</Text>
          <div style={{ display: 'flex', gap: '12px' }}>
            <TextInput
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value || '');
                setError(null);
              }}
              placeholder="company.com"
              style={{ flex: 1 }}
              disabled={loading}
              error={error}
            />
            <Button
              onClick={handleGenerateToken}
              color="blue"
              disabled={loading || !domain.trim()}
            >
              {loading ? 'Generating...' : 'Generate Token'}
            </Button>
          </div>
          <Text size="sm" c="dimmed" mt="xs">
            Enter your organization's domain name (e.g., company.com). You will need to add a TXT
            record to your DNS.
          </Text>
        </div>
      </div>

      {tokens.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Pending DNS Verifications</h3>
          </div>

          {tokens.map((token) => (
            <div key={token.tokenId} className="dns-token-card">
              <div className="dns-token-header">
                <h4>{token.domain}</h4>
                <span className={`status-badge status-${token.status}`}>
                  {token.status.toUpperCase()}
                </span>
              </div>

              <div className="dns-instructions">
                <h5>Step 1: Add DNS TXT Record</h5>
                <p>Add the following TXT record to your DNS provider:</p>

                <div className="dns-record-info">
                  <div className="dns-field">
                    <Text fw={500} mb="xs">Record Type</Text>
                    <div className="copy-field">
                      <code>TXT</code>
                    </div>
                  </div>

                  <div className="dns-field">
                    <Text fw={500} mb="xs">Record Name</Text>
                    <div className="copy-field">
                      <code>{token.recordName}</code>
                      <Button
                        variant="subtle"
                        onClick={() => copyToClipboard(token.recordName, 'Record name')}
                      >
                        📋 Copy
                      </Button>
                    </div>
                  </div>

                  <div className="dns-field">
                    <Text fw={500} mb="xs">Record Value</Text>
                    <div className="copy-field">
                      <code>{token.token}</code>
                      <Button
                        variant="subtle"
                        onClick={() => copyToClipboard(token.token, 'Token value')}
                      >
                        📋 Copy
                      </Button>
                    </div>
                  </div>

                  <div className="dns-field">
                    <Text fw={500} mb="xs">TTL</Text>
                    <div className="copy-field">
                      <code>3600</code>
                    </div>
                  </div>
                </div>

                <h5>Step 2: Wait for DNS Propagation</h5>
                <p>
                  After adding the record, wait 5-10 minutes for DNS propagation. Then click
                  "Verify DNS Record" below.
                </p>

                <div style={{ marginTop: '16px' }}>
                  <Button
                    onClick={() => handleVerifyToken(token.tokenId)}
                    color="blue"
                    disabled={verifying === token.tokenId}
                  >
                    {verifying === token.tokenId ? 'Verifying...' : 'Verify DNS Record'}
                  </Button>
                </div>

                <div className="dns-token-footer">
                  <small>
                    Token expires: {new Date(token.expiresAt).toLocaleString()}
                  </small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tokens.length === 0 && (
        <div className="empty-state">
          <h3>No pending DNS verifications</h3>
          <p>Generate a token above to start the verification process.</p>
        </div>
      )}

      <style>{`
        .dns-verification {
          max-width: 900px;
          margin: 0 auto;
        }

        .dns-token-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 16px;
          background: #fafafa;
        }

        .dns-token-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e0e0e0;
        }

        .dns-token-header h4 {
          margin: 0;
          font-size: 1.2em;
        }

        .dns-instructions h5 {
          margin-top: 20px;
          margin-bottom: 12px;
          color: #333;
        }

        .dns-record-info {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
        }

        .dns-field {
          margin-bottom: 16px;
        }

        .dns-field:last-child {
          margin-bottom: 0;
        }

        .copy-field {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 4px;
        }

        .copy-field code {
          flex: 1;
          background: #f5f5f5;
          padding: 8px 12px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
          word-break: break-all;
        }

        .dns-token-footer {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e0e0e0;
          color: #666;
        }

        .status-pending {
          background: #fff3cd;
          color: #856404;
        }

        .status-verified {
          background: #d4edda;
          color: #155724;
        }

        .status-expired {
          background: #f8d7da;
          color: #721c24;
        }

        .status-failed {
          background: #f8d7da;
          color: #721c24;
        }
      `}</style>
    </div>
  );
};
