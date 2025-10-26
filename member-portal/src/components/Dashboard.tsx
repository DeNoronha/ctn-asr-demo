import type React from 'react';
import { useEffect, useState } from 'react';
import type { ComponentProps, Contact, Endpoint, Token } from '../types';

export const Dashboard: React.FC<ComponentProps> = ({
  apiBaseUrl,
  getAccessToken,
  memberData,
  onNotification,
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Load contacts
      const contactsRes = await fetch(`${apiBaseUrl}/member-contacts`, { headers });
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        setContacts(contactsData.contacts || []);
      }

      // Load endpoints
      const endpointsRes = await fetch(`${apiBaseUrl}/member-endpoints`, { headers });
      if (endpointsRes.ok) {
        const endpointsData = await endpointsRes.json();
        setEndpoints(endpointsData.endpoints || []);
      }

      // Load tokens
      const tokensRes = await fetch(`${apiBaseUrl}/member/tokens`, { headers });
      if (tokensRes.ok) {
        const tokensData = await tokensRes.json();
        setTokens(tokensData.tokens || []);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'status-active';
      case 'PENDING':
        return 'status-pending';
      default:
        return 'status-inactive';
    }
  };

  const activeEndpoints = endpoints.filter((e) => e.is_active).length;
  const activeTokens = tokens.filter(
    (t) => !t.revoked && new Date(t.expires_at) > new Date()
  ).length;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="page-subtitle">Welcome back! Here's an overview of your organization.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Organization Status</h3>
          <div className={`status-badge ${getStatusColor(memberData.status)}`}>
            {memberData.status}
          </div>
          <p style={{ marginTop: '0.5rem', color: 'var(--ctn-text-light)', fontSize: '0.9rem' }}>
            Membership: {memberData.membershipLevel || 'Basic'}
          </p>
        </div>

        <div className="stat-card">
          <h3>Contacts</h3>
          <div className="stat-value">{contacts.length}</div>
          <p style={{ marginTop: '0.5rem', color: 'var(--ctn-text-light)', fontSize: '0.9rem' }}>
            {contacts.filter((c) => c.is_active).length} active
          </p>
        </div>

        <div className="stat-card">
          <h3>Data Endpoints</h3>
          <div className="stat-value">{endpoints.length}</div>
          <p style={{ marginTop: '0.5rem', color: 'var(--ctn-text-light)', fontSize: '0.9rem' }}>
            {activeEndpoints} active
          </p>
        </div>

        <div className="stat-card">
          <h3>API Tokens</h3>
          <div className="stat-value">{activeTokens}</div>
          <p style={{ marginTop: '0.5rem', color: 'var(--ctn-text-light)', fontSize: '0.9rem' }}>
            {tokens.length} total issued
          </p>
        </div>
      </div>

      <div className="card-grid">
        <div className="card">
          <div className="card-header">
            <h3>Organization Information</h3>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <strong>Legal Name:</strong>
              <span>{memberData.legalName}</span>
            </div>
            <div className="info-item">
              <strong>Organization ID:</strong>
              <span>{memberData.organizationId}</span>
            </div>
            <div className="info-item">
              <strong>Domain:</strong>
              <span>{memberData.domain}</span>
            </div>
            <div className="info-item">
              <strong>Member Since:</strong>
              <span>{new Date(memberData.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {memberData.registryIdentifiers && memberData.registryIdentifiers.length > 0 && (
            <>
              <div className="card-header" style={{ marginTop: '1rem', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Registry Identifiers</h4>
              </div>
              <div className="info-grid">
                {memberData.registryIdentifiers.slice(0, 4).map((identifier, index) => (
                  <div key={index} className="info-item">
                    <strong>
                      {identifier.identifierType}
                      {identifier.countryCode && ` (${identifier.countryCode})`}:
                    </strong>
                    <span>{identifier.identifierValue}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Recent Activity</h3>
          </div>
          <div className="empty-state-small">
            <p style={{ color: 'var(--ctn-text-light)' }}>No recent activity</p>
          </div>
        </div>
      </div>

      {endpoints.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Recent Endpoints</h3>
          </div>
          <div className="simple-list">
            {endpoints.slice(0, 5).map((endpoint) => (
              <div key={endpoint.legal_entity_endpoint_id} className="list-item">
                <div>
                  <strong>{endpoint.endpoint_name}</strong>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--ctn-text-light)',
                      margin: '0.25rem 0 0 0',
                    }}
                  >
                    {endpoint.endpoint_url}
                  </p>
                </div>
                <span className={endpoint.is_active ? 'status-active' : 'status-inactive'}>
                  {endpoint.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
