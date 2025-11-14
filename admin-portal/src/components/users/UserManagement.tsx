import * as graphService from '../../services/graphService';
import { logger } from '../../utils/logger';
/**
 * User Management Page
 * System Admins can view and manage all users
 */

import { ActionIcon, Button, Group, Tooltip } from '@mantine/core';
import { DataTable, type DataTableColumn, useDataTableColumns } from 'mantine-datatable';
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { RoleGuard } from '../../auth/ProtectedRoute';
import { UserRole } from '../../auth/authConfig';
import { AuditAction, auditLogService } from '../../services/auditLogService';
import { Edit2, Shield, Trash2, UserPlus } from '../icons';
import { PageHeader } from '../shared/PageHeader';
import { LoadingState } from '../shared/LoadingState';
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
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
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
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (userData: { email: string; name: string; role: UserRole }) => {
    try {
      logger.log('Inviting user:', userData);

      await graphService.inviteUser(userData.email, userData.name, [userData.role]);

      // Log the action
      if (currentUser) {
        auditLogService.log({
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
        auditLogService.log({
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
    try {
      logger.log('Toggle user status:', userId, enabled);

      await graphService.toggleUserStatus(userId, enabled);

      // Log the action
      if (currentUser) {
        const user = users.find((u) => u.id === userId);
        auditLogService.log({
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
    }
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
            [UserRole.SYSTEM_ADMIN]: 'role-system-admin',
            [UserRole.ASSOCIATION_ADMIN]: 'role-association-admin',
            [UserRole.MEMBER]: 'role-member',
          };
          const role = record.primaryRole;
          return (
            <div>
              <span className={`role-badge ${roleColors[role]}`}>{role}</span>
            </div>
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
            <div>
              <span className={`status-badge status-${enabled ? 'active' : 'disabled'}`}>
                {enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
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
          return (
            <Group gap={4} wrap="nowrap">
              <Tooltip label="Edit user">
                <ActionIcon
                  variant="subtle"
                  color="gray"
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
          <Button color="blue" onClick={() => setShowInviteDialog(true)}>
            <UserPlus size={18} style={{ marginRight: 8 }} />
            Invite User
          </Button>
        </div>

        <LoadingState loading={loading} minHeight={400}>
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
            <DataTable
              records={users}
              columns={effectiveColumns}
              storeColumnsKey="user-management-grid"
              withTableBorder
              withColumnBorders
              striped
              highlightOnHover
            />
          </ErrorBoundary>
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
