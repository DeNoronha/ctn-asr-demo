import { logger } from '../../utils/logger';
/**
 * User Management Page
 * System Admins can view and manage all users
 */

import { Button } from '@mantine/core';
import { DataTable, useDataTableColumns, type DataTableColumn } from 'mantine-datatable';
import { Edit2, Shield, Trash2, UserPlus } from '../icons';
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { RoleGuard } from '../../auth/ProtectedRoute';
import { UserRole } from '../../auth/authConfig';
import { AuditAction, auditLogService } from '../../services/auditLogService';
import LoadingSpinner from '../LoadingSpinner';
import EditUserDialog from './EditUserDialog';
import InviteUserDialog from './InviteUserDialog';
import './UserManagement.css';
import { ErrorBoundary } from '../ErrorBoundary';
import { defaultDataTableProps, defaultPaginationOptions } from '../shared/DataTableConfig';
import { formatDateTimeGB } from '../../utils/dateFormat';

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
      // TODO: Replace with actual API call to fetch users from Azure Entra ID
      // For now, show mock data including current user
      const mockUsers: User[] = [
        {
          id: currentUser?.account.localAccountId || '1',
          email: currentUser?.account.username || '',
          name: currentUser?.account.name || '',
          roles: currentUser?.roles || [UserRole.SYSTEM_ADMIN],
          primaryRole: currentUser?.primaryRole || UserRole.SYSTEM_ADMIN,
          enabled: true,
          createdAt: new Date('2024-01-15'),
          lastLogin: new Date(),
        },
        {
          id: '2',
          email: 'admin@association.com',
          name: 'John Smith',
          roles: [UserRole.ASSOCIATION_ADMIN],
          primaryRole: UserRole.ASSOCIATION_ADMIN,
          enabled: true,
          createdAt: new Date('2024-02-01'),
          lastLogin: new Date('2024-10-08'),
        },
        {
          id: '3',
          email: 'member@example.com',
          name: 'Jane Doe',
          roles: [UserRole.MEMBER],
          primaryRole: UserRole.MEMBER,
          enabled: true,
          createdAt: new Date('2024-03-10'),
          lastLogin: new Date('2024-10-09'),
        },
      ];
      setUsers(mockUsers);
    } catch (error) {
      logger.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (userData: { email: string; name: string; role: UserRole }) => {
    // TODO: Implement actual user invitation via Microsoft Graph API
    logger.log('Inviting user:', userData);

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
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditDialog(true);
  };

  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    // TODO: Implement user update via Microsoft Graph API
    logger.log('Updating user:', userId, updates);

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
  };

  const handleToggleUserStatus = async (userId: string, enabled: boolean) => {
    // TODO: Implement enable/disable user via Microsoft Graph API
    logger.log('Toggle user status:', userId, enabled);

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
        width: 120,
        toggleable: false,
        render: (record) => {
          const isCurrentUser = record.id === currentUser?.account.localAccountId;
          return (
            <div className="action-buttons">
              <Button
                variant="subtle"
                size="sm"
                onClick={() => handleEditUser(record)}
                title="Edit user"
              >
                <Edit2 size={16} />
              </Button>
              {!isCurrentUser && (
                <Button
                  variant="subtle"
                  size="sm"
                  color="red"
                  onClick={() => handleToggleUserStatus(record.id, !record.enabled)}
                  title={record.enabled ? 'Disable user' : 'Enable user'}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
  });

  return (
    <RoleGuard allowedRoles={[UserRole.SYSTEM_ADMIN]}>
      <div className="user-management">
        <div className="view-header">
          <div className="header-content">
            <Shield size={32} className="header-icon" />
            <div>
              <h2>User Management</h2>
              <p className="header-description">Manage user access and roles</p>
            </div>
          </div>
          <Button color="blue" onClick={() => setShowInviteDialog(true)}>
            <UserPlus size={18} style={{ marginRight: 8 }} />
            Invite User
          </Button>
        </div>

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

        {loading ? (
          <LoadingSpinner size="large" message="Loading users..." />
        ) : (
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
        )}

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
