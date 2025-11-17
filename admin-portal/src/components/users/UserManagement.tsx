import * as graphService from '../../services/graphService';
import { logger } from '../../utils/logger';
import { isConsentRequiredError, getErrorMessage, logError } from '../../types/errors';
/**
 * User Management Page
 * System Admins can view and manage all users
 */

import { ActionIcon, Alert, Badge, Button, Group, Paper, Stack, Text, Tooltip } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { DataTable, type DataTableColumn, useDataTableColumns } from 'mantine-datatable';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import { RoleGuard } from '../../auth/ProtectedRoute';
import { UserRole } from '../../auth/authConfig';
import { AuditAction, auditLogService } from '../../services/auditLogService';
import { Edit2, Shield, Trash2, UserPlus } from '../icons';
import { LoadingState } from '../shared/LoadingState';
import { PageHeader } from '../shared/PageHeader';
import EditUserDialog from './EditUserDialog';
import InviteUserDialog from './InviteUserDialog';
import './UserManagement.css';
import { formatDateTimeGB } from '../../utils/dateFormat';
import { ErrorBoundary } from '../ErrorBoundary';
import { defaultDataTableProps, defaultPaginationOptions } from '../shared/DataTableConfig';

interface User {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  primaryRole: UserRole;
  enabled: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [consentRequired, setConsentRequired] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Responsive breakpoint detection (768px = tablet breakpoint)
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setConsentRequired(false);
    setConsentError(null);
    try {
      const graphUsers = await graphService.listUsers();

      // Map graphService.User to local User interface
      const mappedUsers: User[] = graphUsers.map((gu) => ({
        id: gu.id,
        email: gu.email,
        name: gu.displayName,
        roles: gu.roles,
        primaryRole: gu.roles[0] || UserRole.MEMBER,
        enabled: gu.enabled,
        createdAt: new Date(gu.createdDateTime),
        lastLogin: gu.lastSignInDateTime ? new Date(gu.lastSignInDateTime) : undefined,
      }));

      setUsers(mappedUsers);
      logger.log(`Loaded ${mappedUsers.length} users from Microsoft Graph`);
    } catch (error) {
      logger.error('Error loading users:', error);
      logError(error, 'UserManagement.loadUsers');

      // Check if this is a consent error
      if (isConsentRequiredError(error)) {
        setConsentRequired(true);
        setConsentError(
          'Administrator consent is required to access Microsoft Graph API for user management.'
        );
      } else {
        setConsentError(getErrorMessage(error, 'Failed to load users. Please try again or contact support.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGrantConsent = async () => {
    try {
      setLoading(true);
      await graphService.requestGraphConsent();
      // After consent is granted, reload users
      await loadUsers();
    } catch (error) {
      logger.error('Failed to grant consent:', error);
      setConsentError('Failed to grant consent. Please ensure you have administrator privileges.');
      setLoading(false);
    }
  };

  const handleInviteUser = async (userData: { email: string; name: string; role: UserRole }) => {
    try {
      logger.log('Inviting user:', userData);

      await graphService.inviteUser(userData.email, userData.name, [userData.role]);

      // Log the action
      if (currentUser) {
        await auditLogService.log({
          action: AuditAction.USER_INVITED,
          userId: currentUser.account.localAccountId,
          userName: currentUser.account.name || '',
          userRole: currentUser.primaryRole,
          targetType: 'user',
          targetName: userData.email,
          details: `Invited ${userData.name} (${userData.email}) with role ${userData.role}`,
          metadata: { role: userData.role },
        });
      }

      setShowInviteDialog(false);
      await loadUsers();
    } catch (error) {
      logger.error('Failed to invite user:', error);
      throw error;
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditDialog(true);
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      logger.log('Updating user:', userId, updates);

      // Map our User updates to Graph API format
      const graphUpdates: { displayName?: string; accountEnabled?: boolean } = {};
      if (updates.name) graphUpdates.displayName = updates.name;
      if (updates.enabled !== undefined) graphUpdates.accountEnabled = updates.enabled;

      await graphService.updateUser(userId, graphUpdates);

      // Log the action
      if (currentUser) {
        const user = users.find((u) => u.id === userId);
        await auditLogService.log({
          action: AuditAction.USER_UPDATED,
          userId: currentUser.account.localAccountId,
          userName: currentUser.account.name || '',
          userRole: currentUser.primaryRole,
          targetType: 'user',
          targetId: userId,
          targetName: user?.email,
          details: `Updated user ${user?.name}`,
          metadata: updates,
        });
      }

      setShowEditDialog(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw error;
    }
  };

  const handleToggleUserStatus = async (userId: string, enabled: boolean) => {
    setActionInProgress(userId);
    try {
      logger.log('Toggle user status:', userId, enabled);

      await graphService.toggleUserStatus(userId, enabled);

      // Log the action
      if (currentUser) {
        const user = users.find((u) => u.id === userId);
        await auditLogService.log({
          action: enabled ? AuditAction.USER_ENABLED : AuditAction.USER_DISABLED,
          userId: currentUser.account.localAccountId,
          userName: currentUser.account.name || '',
          userRole: currentUser.primaryRole,
          targetType: 'user',
          targetId: userId,
          targetName: user?.email,
          details: `${enabled ? 'Enabled' : 'Disabled'} user ${user?.name}`,
        });
      }

      await loadUsers();
    } catch (error) {
      logger.error('Failed to toggle user status:', error);
      throw error;
    } finally {
      setActionInProgress(null);
    }
  };

  // Mobile card view rendering
  const renderMobileUserCard = (user: User) => {
    const isCurrentUser = user.id === currentUser?.account.localAccountId;
    const isActionInProgress = actionInProgress === user.id;
    const isAnyActionInProgress = actionInProgress !== null;

    const roleColors: Record<UserRole, string> = {
      [UserRole.SYSTEM_ADMIN]: 'red',
      [UserRole.ASSOCIATION_ADMIN]: 'yellow',
      [UserRole.MEMBER]: 'blue',
    };

    return (
      <Paper
        key={user.id}
        p="md"
        withBorder
        radius="md"
        className="user-card-mobile"
        style={{ marginBottom: '12px' }}
      >
        <Stack gap="sm">
          {/* Name and Status Row */}
          <Group justify="space-between" align="flex-start">
            <div style={{ flex: 1 }}>
              <Text fw={600} size="md" mb={4}>
                {user.name}
              </Text>
              <Text size="sm" c="dimmed" style={{ wordBreak: 'break-all' }}>
                {user.email}
              </Text>
            </div>
            <Badge
              color={user.enabled ? 'green' : 'red'}
              variant="light"
              size="sm"
              style={{ flexShrink: 0 }}
            >
              {user.enabled ? 'Active' : 'Disabled'}
            </Badge>
          </Group>

          {/* Role Badge */}
          <Group gap="xs">
            <Text size="xs" c="dimmed" fw={500}>
              Role:
            </Text>
            <Badge color={roleColors[user.primaryRole]} variant="light" size="sm">
              {user.primaryRole}
            </Badge>
          </Group>

          {/* Login and Created Info */}
          <Stack gap={4}>
            <Group gap="xs">
              <Text size="xs" c="dimmed" fw={500}>
                Last Login:
              </Text>
              <Text size="xs">
                {user.lastLogin ? formatDateTimeGB(user.lastLogin) : '—'}
              </Text>
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed" fw={500}>
                Created:
              </Text>
              <Text size="xs">{new Date(user.createdAt).toLocaleDateString('en-GB')}</Text>
            </Group>
          </Stack>

          {/* Action Buttons */}
          <Group gap="sm" mt="xs">
            <Button
              variant="light"
              color="gray"
              size="sm"
              leftSection={<Edit2 size={16} />}
              disabled={isAnyActionInProgress}
              onClick={() => handleEditUser(user)}
              aria-label={`Edit ${user.name}`}
              style={{ flex: 1 }}
            >
              Edit
            </Button>
            {!isCurrentUser && (
              <Button
                variant="light"
                color="red"
                size="sm"
                leftSection={<Trash2 size={16} />}
                loading={isActionInProgress}
                disabled={isAnyActionInProgress}
                onClick={() => handleToggleUserStatus(user.id, !user.enabled)}
                aria-label={user.enabled ? `Disable ${user.name}` : `Enable ${user.name}`}
                style={{ flex: 1 }}
              >
                {user.enabled ? 'Disable' : 'Enable'}
              </Button>
            )}
          </Group>
        </Stack>
      </Paper>
    );
  };

  // mantine-datatable column definitions
  const { effectiveColumns } = useDataTableColumns<User>({
    key: 'user-management-grid',
    columns: [
      {
        accessor: 'name',
        title: 'Name',
        width: 200,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'email',
        title: 'Email',
        width: 250,
        toggleable: true,
        resizable: true,
        sortable: true,
      },
      {
        accessor: 'primaryRole',
        title: 'Role',
        width: 180,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => {
          const roleColors: Record<UserRole, string> = {
            [UserRole.SYSTEM_ADMIN]: 'red',
            [UserRole.ASSOCIATION_ADMIN]: 'yellow',
            [UserRole.MEMBER]: 'blue',
          };
          const role = record.primaryRole;
          return (
            <Badge color={roleColors[role]} variant="light" size="sm">
              {role}
            </Badge>
          );
        },
      },
      {
        accessor: 'enabled',
        title: 'Status',
        width: 120,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => {
          const enabled = record.enabled;
          return (
            <Badge color={enabled ? 'green' : 'red'} variant="light" size="sm">
              {enabled ? 'Active' : 'Disabled'}
            </Badge>
          );
        },
      },
      {
        accessor: 'lastLogin',
        title: 'Last Login',
        width: 180,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => {
          if (!record.lastLogin) return <div>—</div>;
          return <div>{formatDateTimeGB(record.lastLogin)}</div>;
        },
      },
      {
        accessor: 'createdAt',
        title: 'Created',
        width: 150,
        toggleable: true,
        resizable: true,
        sortable: true,
        render: (record) => <div>{new Date(record.createdAt).toLocaleDateString('en-GB')}</div>,
      },
      {
        accessor: 'actions' as any,
        title: 'Actions',
        width: '0%',
        toggleable: false,
        render: (record) => {
          const isCurrentUser = record.id === currentUser?.account.localAccountId;
          const isActionInProgress = actionInProgress === record.id;
          const isAnyActionInProgress = actionInProgress !== null;

          return (
            <Group gap={4} wrap="nowrap">
              <Tooltip label="Edit user">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  disabled={isAnyActionInProgress}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleEditUser(record);
                  }}
                  aria-label={`Edit ${record.name}`}
                >
                  <Edit2 size={16} />
                </ActionIcon>
              </Tooltip>
              {!isCurrentUser && (
                <Tooltip label={record.enabled ? 'Disable user' : 'Enable user'}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    loading={isActionInProgress}
                    disabled={isAnyActionInProgress}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleToggleUserStatus(record.id, !record.enabled);
                    }}
                    aria-label={record.enabled ? `Disable ${record.name}` : `Enable ${record.name}`}
                  >
                    <Trash2 size={16} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          );
        },
      },
    ],
  });

  return (
    <RoleGuard allowedRoles={[UserRole.SYSTEM_ADMIN]}>
      <div className="user-management">
        <div className="view-header">
          <PageHeader titleKey="userManagement" />
          <Button color="blue" onClick={() => setShowInviteDialog(true)} disabled={consentRequired}>
            <UserPlus size={18} style={{ marginRight: 8 }} />
            {t('userManagement.inviteUser')}
          </Button>
        </div>

        {consentRequired && (
          <Alert color="orange" title="Microsoft Graph API Consent Required" mb="lg">
            <Stack gap="md">
              <Text size="sm">
                To manage users, this application needs permission to access Microsoft Graph API.
                These permissions require administrator consent.
              </Text>
              <Text size="sm" fw={500}>
                Required permissions:
              </Text>
              <ul style={{ margin: '0', paddingLeft: '20px' }}>
                <li>
                  <Text size="sm">User.Read.All - Read all user profiles</Text>
                </li>
                <li>
                  <Text size="sm">User.ReadWrite.All - Create, update, and delete users</Text>
                </li>
                <li>
                  <Text size="sm">Application.Read.All - Read service principal metadata</Text>
                </li>
                <li>
                  <Text size="sm">AppRoleAssignment.ReadWrite.All - Manage app role assignments</Text>
                </li>
              </ul>
              <Button
                color="blue"
                onClick={handleGrantConsent}
                loading={loading}
                style={{ alignSelf: 'flex-start' }}
              >
                <Shield size={18} style={{ marginRight: 8 }} />
                Grant Admin Consent
              </Button>
              {consentError && (
                <Alert color="red" title="Error" mt="sm">
                  <Text size="sm">{consentError}</Text>
                </Alert>
              )}
            </Stack>
          </Alert>
        )}

        <LoadingState loading={loading && !consentRequired} minHeight={400}>
          {users.length > 0 ? (
            <>
              <div className="user-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Users</span>
                  <span className="stat-value">{users.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">System Admins</span>
                  <span className="stat-value">
                    {users.filter((u) => u.primaryRole === UserRole.SYSTEM_ADMIN).length}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Association Admins</span>
                  <span className="stat-value">
                    {users.filter((u) => u.primaryRole === UserRole.ASSOCIATION_ADMIN).length}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Members</span>
                  <span className="stat-value">
                    {users.filter((u) => u.primaryRole === UserRole.MEMBER).length}
                  </span>
                </div>
              </div>

              <ErrorBoundary>
                {isMobile ? (
                  <div className="user-cards-mobile">{users.map(renderMobileUserCard)}</div>
                ) : (
                  <DataTable
                    records={users}
                    columns={effectiveColumns}
                    storeColumnsKey="user-management-grid"
                    withTableBorder
                    withColumnBorders
                    striped
                    highlightOnHover
                  />
                )}
              </ErrorBoundary>
            </>
          ) : (
            <Paper p="xl" withBorder radius="md" style={{ textAlign: 'center' }}>
              <Stack align="center" gap="md">
                <UserPlus size={48} style={{ color: 'var(--mantine-color-gray-5)' }} />
                <div>
                  <Text size="lg" fw={600} mb="xs">
                    {t('userManagement.emptyState.title')}
                  </Text>
                  <Text size="sm" c="dimmed" mb="lg">
                    {t('userManagement.emptyState.description')}
                  </Text>
                </div>
                <Button
                  color="blue"
                  size="md"
                  onClick={() => setShowInviteDialog(true)}
                  leftSection={<UserPlus size={18} />}
                >
                  {t('userManagement.emptyState.inviteFirstUser')}
                </Button>
              </Stack>
            </Paper>
          )}
        </LoadingState>

        {showInviteDialog && (
          <InviteUserDialog
            onClose={() => setShowInviteDialog(false)}
            onInvite={handleInviteUser}
          />
        )}

        {showEditDialog && selectedUser && (
          <EditUserDialog
            user={selectedUser}
            onClose={() => {
              setShowEditDialog(false);
              setSelectedUser(null);
            }}
            onUpdate={handleUpdateUser}
          />
        )}
      </div>
    </RoleGuard>
  );
};

export default React.memo(UserManagement);
