import { AsrApiClient, type EndpointConsumerGrant } from '@ctn/api-client';
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconKey, IconLink, IconTrash, IconX } from '@tabler/icons-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from '../types';
import { LoadingState } from './shared/LoadingState';

export const MyAccessGrantsView: React.FC<ComponentProps> = ({
  apiBaseUrl,
  getAccessToken,
  memberData,
  onNotification,
}) => {
  const [grants, setGrants] = useState<EndpointConsumerGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeModal, setRevokeModal] = useState<EndpointConsumerGrant | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const apiClient = useMemo(
    () =>
      new AsrApiClient({
        baseURL: apiBaseUrl,
        getAccessToken,
        retryAttempts: 3,
      }),
    [apiBaseUrl, getAccessToken]
  );

  const loadGrants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.endpoints.getMyGrants();
      setGrants(data);
    } catch (error) {
      console.error('Error loading grants:', error);
      onNotification('Failed to load access grants', 'error');
    } finally {
      setLoading(false);
    }
  }, [apiClient, onNotification]);

  useEffect(() => {
    loadGrants();
  }, [loadGrants]);

  const handleRevokeGrant = async () => {
    if (!revokeModal) return;

    setRevoking(revokeModal.grant_id);
    try {
      await apiClient.endpoints.revokeGrant(revokeModal.grant_id, {
        revocation_reason: revokeReason || 'Consumer requested revocation',
      });

      notifications.show({
        title: 'Access Revoked',
        message: `Your access to ${revokeModal.endpoint_name} has been revoked.`,
        color: 'blue',
        icon: <IconCheck size={16} />,
      });

      setRevokeModal(null);
      setRevokeReason('');
      await loadGrants();
    } catch (error: unknown) {
      console.error('Error revoking grant:', error);
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      const msg = err?.response?.data?.error || err?.message || 'Failed to revoke access';
      notifications.show({
        title: 'Revocation Failed',
        message: msg,
        color: 'red',
      });
    } finally {
      setRevoking(null);
    }
  };

  const activeGrants = grants.filter((g) => g.is_active);
  const revokedGrants = grants.filter((g) => !g.is_active);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="my-access-grants-view">
      <div className="page-header">
        <div>
          <h2>Step 4: My Connections</h2>
          <p className="page-subtitle">
            View endpoints you're connected to. Use your System Credentials to authenticate and
            start exchanging data.
          </p>
        </div>
      </div>

      <div className="card">
        <LoadingState loading={loading && grants.length === 0} minHeight={300}>
          {grants.length === 0 ? (
            <Paper
              p="xl"
              style={{
                textAlign: 'center',
                background: '#f9fafb',
                borderRadius: '8px',
              }}
            >
              <ThemeIcon size={60} radius="xl" color="gray" variant="light" mb="md">
                <IconKey size={30} />
              </ThemeIcon>
              <Text size="lg" fw={500} mb="xs">
                No access grants yet
              </Text>
              <Text size="sm" c="dimmed">
                Request access to endpoints from the CTN Directory to see them here
              </Text>
            </Paper>
          ) : (
            <Stack gap="xl">
              {/* Active Grants */}
              {activeGrants.length > 0 && (
                <div>
                  <Text fw={600} size="lg" mb="md">
                    Active Grants ({activeGrants.length})
                  </Text>
                  <Stack gap="md">
                    {activeGrants.map((grant) => (
                      <Card key={grant.grant_id} withBorder padding="lg" radius="md">
                        <Group justify="space-between" mb="xs">
                          <Group gap="sm">
                            <ThemeIcon size="sm" variant="light" color="green">
                              <IconLink size={16} />
                            </ThemeIcon>
                            <Text fw={600} size="lg">
                              {grant.endpoint_name || 'Unknown Endpoint'}
                            </Text>
                          </Group>
                          <Badge color="green" variant="light">
                            Active
                          </Badge>
                        </Group>

                        <Text size="sm" c="dimmed" mb="sm">
                          {grant.endpoint_description || 'No description provided'}
                        </Text>

                        <Group gap="xs" mb="md">
                          <Badge variant="outline" color="blue" size="sm">
                            Provider: {grant.provider_name || 'Unknown'}
                          </Badge>
                          {grant.data_category && (
                            <Badge variant="outline" color="gray" size="sm">
                              {grant.data_category}
                            </Badge>
                          )}
                          {grant.endpoint_type && (
                            <Badge variant="outline" color="gray" size="sm">
                              {grant.endpoint_type}
                            </Badge>
                          )}
                        </Group>

                        <Paper withBorder p="sm" mb="md">
                          <Group gap="lg">
                            <div>
                              <Text size="xs" c="dimmed">
                                Granted
                              </Text>
                              <Text size="sm" fw={500}>
                                {formatDate(grant.granted_at)}
                              </Text>
                            </div>
                            {grant.endpoint_url && (
                              <div>
                                <Text size="xs" c="dimmed">
                                  Endpoint URL
                                </Text>
                                <Text size="sm" fw={500} style={{ fontFamily: 'monospace' }}>
                                  {grant.endpoint_url}
                                </Text>
                              </div>
                            )}
                            {grant.granted_scopes && grant.granted_scopes.length > 0 && (
                              <div>
                                <Text size="xs" c="dimmed">
                                  Scopes
                                </Text>
                                <Group gap="xs">
                                  {grant.granted_scopes.map((scope) => (
                                    <Badge key={scope} size="xs" variant="light">
                                      {scope}
                                    </Badge>
                                  ))}
                                </Group>
                              </div>
                            )}
                          </Group>
                        </Paper>

                        <Group justify="flex-end">
                          <Button
                            variant="subtle"
                            color="red"
                            size="sm"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => setRevokeModal(grant)}
                          >
                            Revoke My Access
                          </Button>
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                </div>
              )}

              {/* Revoked Grants */}
              {revokedGrants.length > 0 && (
                <div>
                  <Text fw={600} size="lg" mb="md" c="dimmed">
                    Revoked Grants ({revokedGrants.length})
                  </Text>
                  <Stack gap="md">
                    {revokedGrants.map((grant) => (
                      <Card
                        key={grant.grant_id}
                        withBorder
                        padding="lg"
                        radius="md"
                        style={{ opacity: 0.7 }}
                      >
                        <Group justify="space-between" mb="xs">
                          <Group gap="sm">
                            <ThemeIcon size="sm" variant="light" color="gray">
                              <IconX size={16} />
                            </ThemeIcon>
                            <Text fw={600} size="lg" c="dimmed">
                              {grant.endpoint_name || 'Unknown Endpoint'}
                            </Text>
                          </Group>
                          <Badge color="gray" variant="light">
                            Revoked
                          </Badge>
                        </Group>

                        <Group gap="xs" mb="sm">
                          <Badge variant="outline" color="gray" size="sm">
                            Provider: {grant.provider_name || 'Unknown'}
                          </Badge>
                        </Group>

                        <Group gap="lg">
                          <div>
                            <Text size="xs" c="dimmed">
                              Granted
                            </Text>
                            <Text size="sm">{formatDate(grant.granted_at)}</Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">
                              Revoked
                            </Text>
                            <Text size="sm">{formatDate(grant.revoked_at)}</Text>
                          </div>
                          {grant.revocation_reason && (
                            <div>
                              <Text size="xs" c="dimmed">
                                Reason
                              </Text>
                              <Text size="sm">{grant.revocation_reason}</Text>
                            </div>
                          )}
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                </div>
              )}
            </Stack>
          )}
        </LoadingState>
      </div>

      {/* Revoke Confirmation Modal */}
      <Modal
        opened={!!revokeModal}
        onClose={() => {
          setRevokeModal(null);
          setRevokeReason('');
        }}
        title="Revoke Access"
        size="md"
      >
        {revokeModal && (
          <Stack gap="md">
            <Text>
              Are you sure you want to revoke your access to{' '}
              <strong>{revokeModal.endpoint_name}</strong>?
            </Text>

            <Text size="sm" c="dimmed">
              This action cannot be undone. You will need to request access again if you want to
              reconnect to this endpoint.
            </Text>

            <Textarea
              label="Reason (optional)"
              placeholder="Why are you revoking this access?"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.currentTarget.value)}
              rows={3}
            />

            <Group justify="flex-end" gap="sm">
              <Button
                variant="default"
                onClick={() => {
                  setRevokeModal(null);
                  setRevokeReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                color="red"
                loading={revoking === revokeModal.grant_id}
                onClick={handleRevokeGrant}
              >
                Revoke Access
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </div>
  );
};
