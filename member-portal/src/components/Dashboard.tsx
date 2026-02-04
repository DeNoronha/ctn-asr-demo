import {
  Badge,
  Card,
  Group,
  List,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Timeline,
  Title,
} from '@mantine/core';
import {
  IconApi,
  IconArrowRight,
  IconCheck,
  IconCloud,
  IconLink,
  IconSearch,
} from '@tabler/icons-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import type { ComponentProps, Contact, Endpoint, Token } from '../types';
import { DashboardSkeleton } from './shared/DashboardSkeleton';

interface TierInfo {
  tier: number;
  method: string;
  verifiedAt?: string;
  reverificationDue?: string;
  eherkenningLevel?: string;
}

export const Dashboard: React.FC<ComponentProps> = ({ memberData }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadContacts = async () => {
    try {
      const contactsData = await apiClient.member.getContacts();
      setContacts(contactsData.contacts || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      // Set empty array on error to allow dashboard to continue loading
      setContacts([]);
    }
  };

  const loadEndpoints = async () => {
    try {
      const endpointsData = await apiClient.member.getEndpoints();
      setEndpoints(endpointsData.endpoints || []);
    } catch (error) {
      console.error('Error loading endpoints:', error);
      // Set empty array on error to allow dashboard to continue loading
      setEndpoints([]);
    }
  };

  const loadTokens = async () => {
    try {
      const tokensData = await apiClient.member.getTokens();
      setTokens(tokensData.tokens || []);
    } catch (error) {
      console.error('Error loading tokens:', error);
      // Set empty array on error to allow dashboard to continue loading
      setTokens([]);
    }
  };

  const loadTierInfo = async () => {
    try {
      if (memberData.legalEntityId) {
        const tierData = await apiClient.member.getTierInfo(memberData.legalEntityId);
        setTierInfo(tierData);
      }
    } catch (error) {
      console.error('Error loading tier info:', error);
      // Set null on error to hide tier card
      setTierInfo(null);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: Load functions don't need to be dependencies as they don't change
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Load all data in parallel, but don't let one failure break the entire dashboard
      // Each function handles its own errors and sets fallback states
      await Promise.allSettled([loadContacts(), loadEndpoints(), loadTokens(), loadTierInfo()]);
    } catch (error) {
      console.error('Unexpected error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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

  const getTierName = (tier: number) => {
    switch (tier) {
      case 1:
        return 'Tier 1 - eHerkenning';
      case 2:
        return 'Tier 2 - DNS Verification';
      case 3:
        return 'Tier 3 - Email + KvK';
      default:
        return 'Unknown';
    }
  };

  const getTierAccess = (tier: number) => {
    switch (tier) {
      case 1:
        return 'Full access (read, write, publish)';
      case 2:
        return 'Sensitive data read + webhooks';
      case 3:
        return 'Public data only';
      default:
        return 'Unknown';
    }
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1:
        return '#4CAF50'; // Green
      case 2:
        return '#2196F3'; // Blue
      case 3:
        return '#FF9800'; // Orange
      default:
        return '#9E9E9E'; // Grey
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
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
          {/* Membership level display hidden - membership levels feature disabled */}
        </div>

        {tierInfo && (
          <div className="stat-card">
            <h3>Authentication Tier</h3>
            <div
              className="tier-badge"
              style={{
                background: getTierColor(tierInfo.tier),
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                display: 'inline-block',
                fontWeight: 600,
                marginTop: '8px',
              }}
            >
              {getTierName(tierInfo.tier)}
            </div>
            <p style={{ marginTop: '0.5rem', color: 'var(--ctn-text-light)', fontSize: '0.9rem' }}>
              {getTierAccess(tierInfo.tier)}
            </p>
            {tierInfo.reverificationDue && (
              <p style={{ marginTop: '0.5rem', color: '#ff9800', fontSize: '0.85rem' }}>
                Re-verification: {new Date(tierInfo.reverificationDue).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

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

      {/* Getting Started Guide */}
      <Paper withBorder p="lg" radius="md" mb="xl">
        <Group justify="space-between" mb="md">
          <div>
            <Title order={3} mb={4}>
              Getting Started with Data Sharing
            </Title>
            <Text size="sm" c="dimmed">
              Follow these 4 steps to share and consume data on the CTN network
            </Text>
          </div>
          <Badge color="blue" variant="light" size="lg">
            Data Sharing Flow
          </Badge>
        </Group>

        <Timeline active={-1} bulletSize={32} lineWidth={2}>
          <Timeline.Item
            bullet={
              <ThemeIcon size={32} radius="xl" color="blue">
                <IconApi size={18} />
              </ThemeIcon>
            }
            title={
              <Group gap="xs">
                <Text fw={600}>Step 1: API Keys</Text>
                <Badge size="xs" color="gray">
                  Tab: "1. API Keys"
                </Badge>
              </Group>
            }
          >
            <Text c="dimmed" size="sm" mt={4}>
              Create M2M API credentials for your backend systems. These are OAuth 2.0 client
              credentials that your TMS, ERP, or other systems use to authenticate when calling
              endpoints.
            </Text>
          </Timeline.Item>

          <Timeline.Item
            bullet={
              <ThemeIcon size={32} radius="xl" color="teal">
                <IconCloud size={18} />
              </ThemeIcon>
            }
            title={
              <Group gap="xs">
                <Text fw={600}>Step 2: Publish Your Endpoints</Text>
                <Badge size="xs" color="gray">
                  Tab: "2. Publish"
                </Badge>
              </Group>
            }
          >
            <Text c="dimmed" size="sm" mt={4}>
              Register your data endpoints, verify ownership via callback, and publish them to the
              CTN Directory. Choose an access model: Open (auto-approve), Restricted (manual
              approval), or Private (invitation only).
            </Text>
          </Timeline.Item>

          <Timeline.Item
            bullet={
              <ThemeIcon size={32} radius="xl" color="grape">
                <IconSearch size={18} />
              </ThemeIcon>
            }
            title={
              <Group gap="xs">
                <Text fw={600}>Step 3: Discover Other Endpoints</Text>
                <Badge size="xs" color="gray">
                  Tab: "3. Discover"
                </Badge>
              </Group>
            }
          >
            <Text c="dimmed" size="sm" mt={4}>
              Browse the CTN Directory to find endpoints published by other members. Request access
              to endpoints you want to consume. Open endpoints grant access immediately; others
              require provider approval.
            </Text>
          </Timeline.Item>

          <Timeline.Item
            bullet={
              <ThemeIcon size={32} radius="xl" color="green">
                <IconLink size={18} />
              </ThemeIcon>
            }
            title={
              <Group gap="xs">
                <Text fw={600}>Step 4: My Connections</Text>
                <Badge size="xs" color="gray">
                  Tab: "4. My Connections"
                </Badge>
              </Group>
            }
          >
            <Text c="dimmed" size="sm" mt={4}>
              View all endpoints you've been granted access to. Use your API Keys (from Step 1) to
              authenticate your systems and start exchanging data with connected endpoints.
            </Text>
          </Timeline.Item>
        </Timeline>
      </Paper>

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
                {memberData.registryIdentifiers.slice(0, 4).map((identifier) => (
                  <div
                    key={`${identifier.identifierType}-${identifier.identifierValue}`}
                    className="info-item"
                  >
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
          <Stack align="center" gap="xs" py="xl">
            <Text c="dimmed" size="sm">
              No recent activity
            </Text>
          </Stack>
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
