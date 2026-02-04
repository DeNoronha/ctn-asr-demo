import { AsrApiClient, type EndpointDirectoryEntry } from '@ctn/api-client';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconClock,
  IconLock,
  IconLockOpen,
  IconSearch,
  IconWorld,
} from '@tabler/icons-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from '../types';
import { LoadingState } from './shared/LoadingState';

export const DirectoryView: React.FC<ComponentProps> = ({
  apiBaseUrl,
  getAccessToken,
  memberData,
  onNotification,
}) => {
  const [endpoints, setEndpoints] = useState<EndpointDirectoryEntry[]>([]);
  const [filteredEndpoints, setFilteredEndpoints] = useState<EndpointDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [requestingAccess, setRequestingAccess] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDirectoryEntry | null>(null);

  const apiClient = useMemo(
    () =>
      new AsrApiClient({
        baseURL: apiBaseUrl,
        getAccessToken,
        retryAttempts: 3,
      }),
    [apiBaseUrl, getAccessToken]
  );

  const loadDirectory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.endpoints.getDirectory();
      setEndpoints(data);
      setFilteredEndpoints(data);
    } catch (error) {
      console.error('Error loading directory:', error);
      onNotification('Failed to load CTN Directory', 'error');
    } finally {
      setLoading(false);
    }
  }, [apiClient, onNotification]);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEndpoints(endpoints);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = endpoints.filter(
        (ep) =>
          ep.endpoint_name.toLowerCase().includes(query) ||
          ep.provider_name.toLowerCase().includes(query) ||
          ep.endpoint_description?.toLowerCase().includes(query) ||
          ep.data_category?.toLowerCase().includes(query)
      );
      setFilteredEndpoints(filtered);
    }
  }, [searchQuery, endpoints]);

  const handleRequestAccess = async (endpoint: EndpointDirectoryEntry) => {
    setRequestingAccess(endpoint.legal_entity_endpoint_id);
    try {
      const result = await apiClient.endpoints.requestAccess(endpoint.legal_entity_endpoint_id);

      if (result.status === 'approved') {
        notifications.show({
          title: 'Access Granted',
          message: `You now have access to ${endpoint.endpoint_name}. Check "My Access Grants" to view your grants.`,
          color: 'green',
          icon: <IconCheck size={16} />,
        });
      } else {
        notifications.show({
          title: 'Access Requested',
          message: `Your request for ${endpoint.endpoint_name} has been submitted. The provider will review it.`,
          color: 'blue',
          icon: <IconClock size={16} />,
        });
      }

      // Reload to update access_status
      await loadDirectory();
      setSelectedEndpoint(null);
    } catch (error: unknown) {
      console.error('Error requesting access:', error);
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const msg = err?.response?.data?.error || err?.message || 'Failed to request access';
      notifications.show({
        title: 'Request Failed',
        message: msg,
        color: 'red',
      });
    } finally {
      setRequestingAccess(null);
    }
  };

  const getAccessStatusBadge = (endpoint: EndpointDirectoryEntry) => {
    const status = endpoint.access_status;

    if (status === 'granted' || status === 'approved') {
      return (
        <Badge color="green" variant="light" leftSection={<IconCheck size={12} />}>
          Access Granted
        </Badge>
      );
    }
    if (status === 'pending') {
      return (
        <Badge color="yellow" variant="light" leftSection={<IconClock size={12} />}>
          Pending Approval
        </Badge>
      );
    }
    if (status === 'denied') {
      return (
        <Badge color="red" variant="light">
          Denied
        </Badge>
      );
    }
    if (status === 'revoked') {
      return (
        <Badge color="gray" variant="light">
          Revoked
        </Badge>
      );
    }
    return null;
  };

  const getAccessModelIcon = (model: string) => {
    switch (model) {
      case 'open':
        return <IconLockOpen size={16} color="green" />;
      case 'restricted':
        return <IconLock size={16} color="orange" />;
      case 'private':
        return <IconLock size={16} color="red" />;
      default:
        return <IconWorld size={16} />;
    }
  };

  const canRequestAccess = (endpoint: EndpointDirectoryEntry) => {
    const status = endpoint.access_status;
    return !status || status === 'denied' || status === 'revoked';
  };

  return (
    <div className="directory-view">
      <div className="page-header">
        <div>
          <h2>CTN Directory</h2>
          <p className="page-subtitle">
            Discover data endpoints published by other CTN members
          </p>
        </div>
      </div>

      <div className="card">
        <Paper p="md" mb="md">
          <TextInput
            placeholder="Search endpoints by name, provider, or category..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ maxWidth: 400 }}
          />
        </Paper>

        <LoadingState loading={loading && endpoints.length === 0} minHeight={300}>
          {filteredEndpoints.length === 0 ? (
            <Paper
              p="xl"
              style={{
                textAlign: 'center',
                background: '#f9fafb',
                borderRadius: '8px',
              }}
            >
              <ThemeIcon size={60} radius="xl" color="gray" variant="light" mb="md">
                <IconWorld size={30} />
              </ThemeIcon>
              <Text size="lg" fw={500} mb="xs">
                {searchQuery ? 'No matching endpoints found' : 'No endpoints available'}
              </Text>
              <Text size="sm" c="dimmed">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Other CTN members have not published any endpoints yet'}
              </Text>
            </Paper>
          ) : (
            <Stack gap="md">
              {filteredEndpoints.map((endpoint) => (
                <Card key={endpoint.legal_entity_endpoint_id} withBorder padding="lg" radius="md">
                  <Group justify="space-between" mb="xs">
                    <Group gap="sm">
                      <Tooltip label={`Access model: ${endpoint.access_model}`}>
                        <ThemeIcon
                          size="sm"
                          variant="light"
                          color={
                            endpoint.access_model === 'open'
                              ? 'green'
                              : endpoint.access_model === 'restricted'
                                ? 'yellow'
                                : 'red'
                          }
                        >
                          {getAccessModelIcon(endpoint.access_model)}
                        </ThemeIcon>
                      </Tooltip>
                      <Text fw={600} size="lg">
                        {endpoint.endpoint_name}
                      </Text>
                    </Group>
                    {getAccessStatusBadge(endpoint)}
                  </Group>

                  <Text size="sm" c="dimmed" mb="sm">
                    {endpoint.endpoint_description || 'No description provided'}
                  </Text>

                  <Group gap="xs" mb="md">
                    <Badge variant="outline" color="blue" size="sm">
                      {endpoint.provider_name}
                    </Badge>
                    {endpoint.data_category && (
                      <Badge variant="outline" color="gray" size="sm">
                        {endpoint.data_category}
                      </Badge>
                    )}
                    {endpoint.endpoint_type && (
                      <Badge variant="outline" color="gray" size="sm">
                        {endpoint.endpoint_type}
                      </Badge>
                    )}
                    <Badge
                      variant="light"
                      color={
                        endpoint.access_model === 'open'
                          ? 'green'
                          : endpoint.access_model === 'restricted'
                            ? 'yellow'
                            : 'red'
                      }
                      size="sm"
                    >
                      {endpoint.access_model}
                    </Badge>
                  </Group>

                  <Group justify="flex-end">
                    {canRequestAccess(endpoint) && (
                      <Button
                        variant="light"
                        color="blue"
                        size="sm"
                        loading={requestingAccess === endpoint.legal_entity_endpoint_id}
                        onClick={() => setSelectedEndpoint(endpoint)}
                      >
                        {endpoint.access_model === 'open' ? 'Get Access' : 'Request Access'}
                      </Button>
                    )}
                    {endpoint.access_status === 'pending' && (
                      <Text size="sm" c="dimmed">
                        Awaiting provider approval
                      </Text>
                    )}
                  </Group>
                </Card>
              ))}
            </Stack>
          )}
        </LoadingState>
      </div>

      {/* Access Request Confirmation Modal */}
      <Modal
        opened={!!selectedEndpoint}
        onClose={() => setSelectedEndpoint(null)}
        title="Request Access"
        size="md"
      >
        {selectedEndpoint && (
          <Stack gap="md">
            <Text>
              You are about to request access to <strong>{selectedEndpoint.endpoint_name}</strong>{' '}
              from <strong>{selectedEndpoint.provider_name}</strong>.
            </Text>

            <Paper withBorder p="md">
              <Group gap="xs" mb="xs">
                {getAccessModelIcon(selectedEndpoint.access_model)}
                <Text fw={500}>
                  Access Model:{' '}
                  <Badge
                    variant="light"
                    color={
                      selectedEndpoint.access_model === 'open'
                        ? 'green'
                        : selectedEndpoint.access_model === 'restricted'
                          ? 'yellow'
                          : 'red'
                    }
                  >
                    {selectedEndpoint.access_model}
                  </Badge>
                </Text>
              </Group>
              <Text size="sm" c="dimmed">
                {selectedEndpoint.access_model === 'open' && (
                  <>Access will be granted immediately upon request.</>
                )}
                {selectedEndpoint.access_model === 'restricted' && (
                  <>Your request will be reviewed by the provider before access is granted.</>
                )}
                {selectedEndpoint.access_model === 'private' && (
                  <>This endpoint requires explicit invitation from the provider.</>
                )}
              </Text>
            </Paper>

            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={() => setSelectedEndpoint(null)}>
                Cancel
              </Button>
              <Button
                color="blue"
                loading={requestingAccess === selectedEndpoint.legal_entity_endpoint_id}
                onClick={() => handleRequestAccess(selectedEndpoint)}
              >
                {selectedEndpoint.access_model === 'open' ? 'Get Access' : 'Submit Request'}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </div>
  );
};
