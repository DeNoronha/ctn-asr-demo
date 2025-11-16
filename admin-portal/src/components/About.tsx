/**
 * About Page Component
 * Displays build information for both admin portal and API
 */

import {
  ActionIcon,
  Badge,
  Card,
  Code,
  CopyButton,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import type React from 'react';
import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Copy,
  GitBranch,
  Globe,
  Monitor,
  Package,
} from './icons';
import { LoadingState } from './shared/LoadingState';
import { PageHeader } from './shared/PageHeader';
import { PartnerLogos } from './shared/PartnerLogos';
import './About.css';

interface VersionInfo {
  buildNumber: string;
  buildId: string;
  commitSha: string;
  commitShaFull: string;
  branch: string;
  timestamp: string;
  version: string;
  environment: string;
}

interface APIVersionInfo extends VersionInfo {
  api: {
    name: string;
    nodeVersion: string;
    platform: string;
    uptime: number;
  };
  copyright: {
    year: number;
    owner: string;
    license: string;
  };
}

const About: React.FC = () => {
  const [portalVersion, setPortalVersion] = useState<VersionInfo | null>(null);
  const [apiVersion, setApiVersion] = useState<APIVersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const getReadablePlatform = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Mac OS X')) {
      const match = ua.match(/Mac OS X ([\d_]+)/);
      if (match) {
        const version = match[1].replace(/_/g, '.');
        return `macOS ${version}`;
      }
      return 'macOS';
    }
    if (ua.includes('Windows NT')) {
      const match = ua.match(/Windows NT ([\d.]+)/);
      if (match) {
        const versionMap: Record<string, string> = {
          '10.0': 'Windows 10/11',
          '6.3': 'Windows 8.1',
          '6.2': 'Windows 8',
          '6.1': 'Windows 7',
        };
        return versionMap[match[1]] || `Windows NT ${match[1]}`;
      }
      return 'Windows';
    }
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return navigator.platform;
  };

  const [systemInfo] = useState({
    browser: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language,
    platform: getReadablePlatform(),
  });

  useEffect(() => {
    loadVersionInfo();
  }, []);

  const loadVersionInfo = async () => {
    try {
      setLoading(true);

      // Load portal version from /version.json
      const portalResponse = await fetch('/version.json');
      if (portalResponse.ok) {
        const portalData = await portalResponse.json();
        setPortalVersion(portalData);
      } else {
        // Fallback for local development
        setPortalVersion({
          buildNumber: 'dev',
          buildId: '0',
          commitSha: 'local',
          commitShaFull: 'local-development',
          branch: 'local',
          timestamp: new Date().toISOString(),
          version: 'dev',
          environment: 'local',
        });
      }

      // Load API version from /api/v1/version
      const apiResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:7071/api/v1'}/version`
      );
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        setApiVersion(apiData);
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load version info:', err);
      setError('Failed to load version information');
      setLoading(false);
    }
  };

  const getRelativeTime = (date: Date) => {
    const now = Date.now();
    const diffMs = date.getTime() - now;
    const diffMins = Math.round(Math.abs(diffMs) / 60000);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffDays >= 1) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours >= 1) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins >= 1) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'just now';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const absolute = date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
    const relative = getRelativeTime(date);
    return `${absolute} (${relative})`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getEnvironmentBadge = (environment: string) => {
    const envLower = environment.toLowerCase();

    const badgeConfig: Record<string, { color: string; label: string }> = {
      production: { color: 'green', label: 'Production' },
      prod: { color: 'green', label: 'Production' },
      staging: { color: 'yellow', label: 'Staging' },
      development: { color: 'blue', label: 'Development' },
      dev: { color: 'blue', label: 'Development' },
      local: { color: 'gray', label: 'Local' },
    };

    const config = badgeConfig[envLower];
    if (!config) return null;

    return (
      <Badge size="sm" color={config.color} variant="filled">
        {config.label}
      </Badge>
    );
  };

  const isProductionBuild = (buildNumber: string) => {
    return buildNumber !== 'dev' && buildNumber !== 'local' && buildNumber !== '0';
  };

  return (
    <LoadingState loading={loading} minHeight={400}>
      {error ? (
        <div className="about-error">
          <AlertCircle size={48} />
          <p>{error}</p>
        </div>
      ) : (
        <div className="about-view">
          <PageHeader titleKey="about" />

          <div className="about-grid">
            {/* Admin Portal Version Card */}
            <Card withBorder shadow="sm" padding="lg" radius="md">
              <Card.Section
                withBorder
                inheritPadding
                py="md"
                style={{
                  background: 'linear-gradient(135deg, #003366 0%, #005a9c 100%)',
                }}
              >
                <Group gap="xs">
                  <ThemeIcon size="lg" variant="transparent" c="white">
                    <Package size={20} />
                  </ThemeIcon>
                  <Text size="lg" fw={600} c="white">
                    Admin Portal
                  </Text>
                </Group>
              </Card.Section>

              {portalVersion && (
                <Stack gap="md" mt="md">
                  {isProductionBuild(portalVersion.buildNumber) && (
                    <>
                      <Group gap="xs" wrap="nowrap" align="center">
                        <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 120 }}>
                          Version:
                        </Text>
                        <Code color="blue" fw={600}>
                          #{portalVersion.version}
                        </Code>
                        <CopyButton value={portalVersion.version} timeout={2000}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copied' : 'Copy version'} withArrow>
                              <ActionIcon
                                color={copied ? 'teal' : 'gray'}
                                variant="subtle"
                                onClick={copy}
                                size="sm"
                              >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      </Group>
                      <Group gap="xs" wrap="nowrap">
                        <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 120 }}>
                          Build Number:
                        </Text>
                        <Text size="sm">{portalVersion.buildNumber}</Text>
                      </Group>
                    </>
                  )}
                  <Group gap="xs" wrap="nowrap">
                    <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 120 }}>
                      Environment:
                    </Text>
                    {getEnvironmentBadge(portalVersion.environment)}
                  </Group>
                  {portalVersion.branch &&
                    portalVersion.branch !== 'unknown' &&
                    portalVersion.branch !== 'local' && (
                      <Group gap="xs" wrap="nowrap">
                        <GitBranch size={16} />
                        <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 104 }}>
                          Branch:
                        </Text>
                        <Text size="sm">{portalVersion.branch}</Text>
                      </Group>
                    )}
                  {portalVersion.commitSha &&
                    portalVersion.commitSha !== 'unknown' &&
                    portalVersion.commitSha !== 'local' && (
                      <Group gap="xs" wrap="nowrap" align="center">
                        <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 120 }}>
                          Commit:
                        </Text>
                        <Code>{portalVersion.commitSha}</Code>
                        <CopyButton value={portalVersion.commitShaFull} timeout={2000}>
                          {({ copied, copy }) => (
                            <Tooltip
                              label={copied ? 'Copied full commit SHA' : 'Copy full SHA'}
                              withArrow
                            >
                              <ActionIcon
                                color={copied ? 'teal' : 'gray'}
                                variant="subtle"
                                onClick={copy}
                                size="sm"
                              >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      </Group>
                    )}
                  <Group gap="xs" wrap="nowrap">
                    <Calendar size={16} />
                    <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 104 }}>
                      Built:
                    </Text>
                    <Text size="sm">{formatTimestamp(portalVersion.timestamp)}</Text>
                  </Group>
                </Stack>
              )}
            </Card>

            {/* API Version Card */}
            <Card withBorder shadow="sm" padding="lg" radius="md">
              <Card.Section
                withBorder
                inheritPadding
                py="md"
                style={{
                  background: 'linear-gradient(135deg, #003366 0%, #005a9c 100%)',
                }}
              >
                <Group gap="xs">
                  <ThemeIcon size="lg" variant="transparent" c="white">
                    <Package size={20} />
                  </ThemeIcon>
                  <Text size="lg" fw={600} c="white">
                    Backend API
                  </Text>
                </Group>
              </Card.Section>

              {apiVersion ? (
                <Stack gap="md" mt="md">
                  <Group gap="xs" wrap="nowrap">
                    <CheckCircle size={16} style={{ color: '#28a745' }} />
                    <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 104 }}>
                      Status:
                    </Text>
                    <Text size="sm" fw={600} c="green">
                      Online
                    </Text>
                  </Group>
                  {isProductionBuild(apiVersion.buildNumber) && (
                    <>
                      <Group gap="xs" wrap="nowrap" align="center">
                        <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 120 }}>
                          Version:
                        </Text>
                        <Code color="blue" fw={600}>
                          #{apiVersion.version}
                        </Code>
                        <CopyButton value={apiVersion.version} timeout={2000}>
                          {({ copied, copy }) => (
                            <Tooltip label={copied ? 'Copied' : 'Copy version'} withArrow>
                              <ActionIcon
                                color={copied ? 'teal' : 'gray'}
                                variant="subtle"
                                onClick={copy}
                                size="sm"
                              >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      </Group>
                      <Group gap="xs" wrap="nowrap">
                        <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 120 }}>
                          Build Number:
                        </Text>
                        <Text size="sm">{apiVersion.buildNumber}</Text>
                      </Group>
                    </>
                  )}
                  <Group gap="xs" wrap="nowrap">
                    <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 120 }}>
                      Environment:
                    </Text>
                    {getEnvironmentBadge(apiVersion.environment)}
                  </Group>
                  {apiVersion.branch &&
                    apiVersion.branch !== 'unknown' &&
                    apiVersion.branch !== 'local' && (
                      <Group gap="xs" wrap="nowrap">
                        <GitBranch size={16} />
                        <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 104 }}>
                          Branch:
                        </Text>
                        <Text size="sm">{apiVersion.branch}</Text>
                      </Group>
                    )}
                  {apiVersion.commitSha &&
                    apiVersion.commitSha !== 'unknown' &&
                    apiVersion.commitSha !== 'local' && (
                      <Group gap="xs" wrap="nowrap" align="center">
                        <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 120 }}>
                          Commit:
                        </Text>
                        <Code>{apiVersion.commitSha}</Code>
                        <CopyButton value={apiVersion.commitShaFull} timeout={2000}>
                          {({ copied, copy }) => (
                            <Tooltip
                              label={copied ? 'Copied full commit SHA' : 'Copy full SHA'}
                              withArrow
                            >
                              <ActionIcon
                                color={copied ? 'teal' : 'gray'}
                                variant="subtle"
                                onClick={copy}
                                size="sm"
                              >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </CopyButton>
                      </Group>
                    )}
                  <Group gap="xs" wrap="nowrap">
                    <Calendar size={16} />
                    <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 104 }}>
                      Built:
                    </Text>
                    <Text size="sm">{formatTimestamp(apiVersion.timestamp)}</Text>
                  </Group>
                  <Group gap="xs" wrap="nowrap">
                    <Clock size={16} />
                    <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 104 }}>
                      Uptime:
                    </Text>
                    <Text size="sm">{formatUptime(apiVersion.api.uptime)}</Text>
                    {apiVersion.api.uptime > 86400 && (
                      <ThemeIcon size="xs" color="green" variant="light">
                        <CheckCircle size={12} />
                      </ThemeIcon>
                    )}
                  </Group>
                  <Group gap="xs" wrap="nowrap">
                    <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 120 }}>
                      Node.js:
                    </Text>
                    <Text size="sm">{apiVersion.api.nodeVersion}</Text>
                  </Group>
                  <Group gap="xs" wrap="nowrap" align="center">
                    <Globe size={16} />
                    <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 104 }}>
                      API URL:
                    </Text>
                    <Code style={{ fontSize: '0.8rem' }}>
                      {(() => {
                        try {
                          return new URL(
                            import.meta.env.VITE_API_URL ||
                              'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1'
                          ).host;
                        } catch {
                          return 'func-ctn-demo-asr-dev.azurewebsites.net';
                        }
                      })()}
                    </Code>
                    <CopyButton
                      value={
                        import.meta.env.VITE_API_URL ||
                        'https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1'
                      }
                      timeout={2000}
                    >
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? 'Copied' : 'Copy full API URL'} withArrow>
                          <ActionIcon
                            color={copied ? 'teal' : 'gray'}
                            variant="subtle"
                            onClick={copy}
                            size="sm"
                          >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                  <Group gap="xs" wrap="nowrap">
                    <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 120 }}>
                      Region:
                    </Text>
                    <Text size="sm">West Europe</Text>
                  </Group>
                </Stack>
              ) : (
                <Stack
                  gap="md"
                  p="md"
                  style={{ background: '#fff3cd', borderRadius: '6px' }}
                  mt="md"
                >
                  <Group gap="xs">
                    <AlertCircle size={20} style={{ color: '#856404' }} />
                    <Text size="sm" c="#856404" fw={500}>
                      API version information unavailable
                    </Text>
                  </Group>
                  <Text size="xs" c="#856404">
                    The backend API may be offline or unreachable. Please contact support if this
                    persists.
                  </Text>
                </Stack>
              )}
            </Card>

            {/* Browser Info Card */}
            <Card withBorder shadow="sm" padding="lg" radius="md">
              <Card.Section
                withBorder
                inheritPadding
                py="md"
                style={{
                  background: 'linear-gradient(135deg, #003366 0%, #005a9c 100%)',
                }}
              >
                <Group gap="xs">
                  <ThemeIcon size="lg" variant="transparent" c="white">
                    <Monitor size={20} />
                  </ThemeIcon>
                  <Text size="lg" fw={600} c="white">
                    Browser Info
                  </Text>
                </Group>
              </Card.Section>

              <Stack gap="md" mt="md">
                <Group gap="xs" wrap="nowrap">
                  <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 120 }}>
                    Viewport:
                  </Text>
                  <Text size="sm">{systemInfo.viewport}</Text>
                </Group>
                <Group gap="xs" wrap="nowrap">
                  <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 120 }}>
                    Platform:
                  </Text>
                  <Text size="sm">{systemInfo.platform}</Text>
                </Group>
                <Group gap="xs" wrap="nowrap">
                  <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 120 }}>
                    Language:
                  </Text>
                  <Text size="sm">{systemInfo.language}</Text>
                </Group>
                <Group gap="xs" wrap="nowrap" align="flex-start">
                  <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 120, flexShrink: 0 }}>
                    User Agent:
                  </Text>
                  <Text size="xs" c="dimmed" style={{ wordBreak: 'break-word', flex: 1 }}>
                    {systemInfo.browser}
                  </Text>
                </Group>
              </Stack>
            </Card>
          </div>

          {/* Partner Logos Section */}
          <PartnerLogos />
        </div>
      )}
    </LoadingState>
  );
};

export default About;
