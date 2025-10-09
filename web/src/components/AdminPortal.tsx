/**
 * Admin Portal Component
 * Main container for authenticated admin interface
 */

import React, { useState, useEffect } from 'react';
import { DrawerContent } from '@progress/kendo-react-layout';
import { Button } from '@progress/kendo-react-buttons';
import { LogOut, User } from 'lucide-react';
import { api, Member } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { UserRole } from '../auth/authConfig';
import AdminSidebar, { MenuItem } from './AdminSidebar';
import MembersGrid from './MembersGrid';
import MemberForm from './MemberForm';
import { MemberDetailView } from './MemberDetailView';
import { EndpointManagement } from './EndpointManagement';
import UserManagement from './users/UserManagement';
import AuditLogViewer from './audit/AuditLogViewer';
import LoadingSpinner from './LoadingSpinner';
import { RoleGuard } from '../auth/ProtectedRoute';
import { useNotification } from '../contexts/NotificationContext';
import { useAsync } from '../hooks/useAsync';
import { MemberFormData } from '../utils/validation';
import './AdminPortal.css';

const AdminPortal: React.FC = () => {
  const { user, logout } = useAuth();
  const notification = useNotification();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [token, setToken] = useState<string>('');
  const [drawerExpanded, setDrawerExpanded] = useState(true);
  const [selectedView, setSelectedView] = useState<string>('dashboard');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const { loading, execute: loadMembers } = useAsync({
    showErrorNotification: true,
    errorMessage: 'Failed to load members',
  });

  useEffect(() => {
    loadMembersData();
  }, []);

  const loadMembersData = async () => {
    try {
      const data = await loadMembers(() => api.getMembers());
      setMembers(data);
    } catch (error) {
      // Handled by useAsync
    }
  };

  const handleFormSubmit = async (formData: MemberFormData) => {
    await api.createMember(formData);
    setShowForm(false);
    notification.showSuccess('Member registered successfully!');
    await loadMembersData();
  };

  const handleViewDetails = (member: Member) => {
    setSelectedMember(member);
    setSelectedView('member-detail');
  };

  const handleBackToMembers = () => {
    setSelectedMember(null);
    setSelectedView('members');
  };

  const handleIssueToken = async (orgId: string) => {
    try {
      const response = await api.issueToken(orgId);
      setToken(response.access_token);
      notification.showSuccess('Token issued successfully!', 'Token Generated');
    } catch (error) {
      notification.showError('Failed to issue token');
    }
  };

  const handleMenuSelect = (item: MenuItem) => {
    if (item.route) {
      setSelectedView(item.route);
      setSelectedMember(null);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner size="large" message="Loading members..." fullScreen />;
    }

    switch (selectedView) {
      case 'dashboard':
        return (
          <div className="dashboard-view">
            <h2>Dashboard</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Members</h3>
                <div className="stat-value">{members.length}</div>
              </div>
              <div className="stat-card">
                <h3>Active Members</h3>
                <div className="stat-value">
                  {members.filter(m => m.status === 'ACTIVE').length}
                </div>
              </div>
              <div className="stat-card">
                <h3>Pending Members</h3>
                <div className="stat-value">
                  {members.filter(m => m.status === 'PENDING').length}
                </div>
              </div>
              <div className="stat-card">
                <h3>Premium Members</h3>
                <div className="stat-value">
                  {members.filter(m => m.membership_level === 'PREMIUM').length}
                </div>
              </div>
            </div>
          </div>
        );

      case 'members':
        return (
          <div className="members-view">
            <div className="view-header">
              <h2>Member Directory</h2>
              <RoleGuard allowedRoles={[UserRole.ASSOCIATION_ADMIN, UserRole.SYSTEM_ADMIN]}>
                <Button
                  themeColor="primary"
                  onClick={() => setShowForm(!showForm)}
                >
                  {showForm ? 'Cancel' : '+ Register New Member'}
                </Button>
              </RoleGuard>
            </div>

            {showForm && (
              <MemberForm
                onSubmit={handleFormSubmit}
                onCancel={() => setShowForm(false)}
              />
            )}

            {!showForm && (
              <MembersGrid
                members={members}
                onIssueToken={handleIssueToken}
                onViewDetails={handleViewDetails}
                loading={false}
              />
            )}
          </div>
        );

      case 'member-detail':
        if (!selectedMember) {
          setSelectedView('members');
          return null;
        }
        return (
          <MemberDetailView
            member={selectedMember}
            onBack={handleBackToMembers}
            onIssueToken={handleIssueToken}
          />
        );

      case 'endpoints':
        return (
          <div className="endpoints-view">
            <RoleGuard allowedRoles={[UserRole.ASSOCIATION_ADMIN, UserRole.SYSTEM_ADMIN]}>
              {selectedMember ? (
                <EndpointManagement
                  legalEntityId={selectedMember.org_id}
                  legalEntityName={selectedMember.legal_name}
                />
              ) : (
                <div className="empty-state">
                  <h3>Endpoint Management</h3>
                  <p>Select a member from the Members view to manage their endpoints.</p>
                  <Button onClick={() => setSelectedView('members')} themeColor="primary">
                    Go to Members
                  </Button>
                </div>
              )}
            </RoleGuard>
          </div>
        );

      case 'tokens':
        return (
          <div className="tokens-view">
            <h2>Token Management</h2>
            {token ? (
              <div className="token-display">
                <h3>Latest BVAD Token</h3>
                <textarea readOnly value={token} rows={10} className="token-textarea" />
                <Button onClick={() => setToken('')} themeColor="secondary">
                  Clear Token
                </Button>
              </div>
            ) : (
              <div className="empty-state">
                <p>No tokens generated yet. Go to Members to issue a token.</p>
                <Button onClick={() => setSelectedView('members')} themeColor="primary">
                  Go to Members
                </Button>
              </div>
            )}
          </div>
        );

      case 'settings':
        return (
          <div className="settings-view">
            <UserManagement />
          </div>
        );

      case 'audit':
        return (
          <div className="audit-view">
            <AuditLogViewer />
          </div>
        );

      case 'docs':
        return (
          <div className="docs-view">
            <h2>Documentation</h2>
            <div className="docs-content">
              <h3>CTN Association Register</h3>
              <p>Welcome to the CTN Association Register administrative interface.</p>
              <h4>Quick Start</h4>
              <ul>
                <li>Use the <strong>Dashboard</strong> to view key statistics</li>
                <li>Manage members in the <strong>Members</strong> section</li>
                <li>Manage system endpoints in the <strong>Endpoints</strong> section</li>
                <li>Generate and view tokens in <strong>Token Management</strong></li>
              </ul>
            </div>
          </div>
        );

      default:
        return <div>Select a view from the sidebar</div>;
    }
  };

  return (
    <div className="app-container">
      <AdminSidebar
        expanded={drawerExpanded}
        onSelect={handleMenuSelect}
        selectedItem={selectedView === 'member-detail' ? 'members' : selectedView}
      />
      <DrawerContent>
        <div className="main-content">
          <header className="app-header">
            <div className="header-left">
              <Button
                icon="menu"
                fillMode="flat"
                onClick={() => setDrawerExpanded(!drawerExpanded)}
                className="menu-button"
              >
                {drawerExpanded ? '◀' : '▶'}
              </Button>
              <h1>CTN Association Register</h1>
            </div>
            <div className="header-right">
              {user && (
                <div className="user-info">
                  <User size={18} />
                  <div className="user-details">
                    <span className="user-name">{user.account.name}</span>
                    <span className="user-role">{user.primaryRole}</span>
                  </div>
                  <Button
                    fillMode="flat"
                    onClick={handleLogout}
                    title="Sign out"
                  >
                    <LogOut size={16} />
                  </Button>
                </div>
              )}
            </div>
          </header>
          <main className="content-area">
            {renderContent()}
          </main>
        </div>
      </DrawerContent>
    </div>
  );
};

export default AdminPortal;
